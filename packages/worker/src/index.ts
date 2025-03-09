import { BskyAgent } from '@atproto/api';
import { db, ScheduledPost, UserSession } from '@chronopost/database';
import { dateUtils } from '@chronopost/shared';
import { BlobRef } from '@atproto/lexicon';

interface ImageUploadResult {
  image: BlobRef;
  alt: string;
}

export interface Env {
  DB: D1Database;
  BLUESKY_SERVICE: string;
}

interface PostContent {
  text: string;
  images?: string[];
  embed?: string;
}

// 投稿を実行する関数
async function publishPost(
  post: ScheduledPost & { userSession: UserSession },
  env: Env
): Promise<void> {
  try {
    const agent = new BskyAgent({ service: env.BLUESKY_SERVICE });
    await agent.login({
      identifier: post.userSession.identifier,
      appPassword: post.userSession.appPassword,
    });

    // content内のimagesがある場合は画像をアップロード
    const content = post.content as PostContent;
    const images = content.images || [];
    const uploadedImages: ImageUploadResult[] = [];

    for (const image of images) {
      const buffer = Buffer.from(image, 'base64');
      const blob = new Blob([buffer]);
      const upload = await agent.uploadBlob(blob, {
        encoding: 'image/jpeg',
      });
      uploadedImages.push({
        image: upload.data.blob,
        alt: 'Image',
      });
    }

    // 投稿を作成
    const postOptions: Record<string, unknown> = {
      text: content.text,
    };

    // 画像がある場合は添付
    if (uploadedImages.length > 0) {
      postOptions.embed = {
        $type: 'app.bsky.embed.images',
        images: uploadedImages,
      };
    }

    // URLの埋め込みがある場合
    if (content.embed) {
      if (!postOptions.embed) {
        postOptions.embed = {
          $type: 'app.bsky.embed.external',
          external: {
            uri: content.embed,
            title: 'Shared Link',
            description: 'Embedded URL from scheduled post',
          },
        };
      }
    }

    await agent.post(postOptions);
    await db.markAsPublished(post.id);
  } catch (error) {
    console.error('Failed to publish post:', error);
    if (error instanceof Error) {
      await db.logFailure(post.id, error.message);
    } else {
      await db.logFailure(post.id, 'Unknown error occurred');
    }
  }
}

export default {
  // Cronトリガーで実行される関数
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    try {
      const now = new Date();
      const currentMinute = dateUtils.truncateToMinute(now);
      
      // 現在時刻に投稿予定のポストを取得
      const scheduledPosts = await db.getScheduledPostsAt(currentMinute);

      // 各投稿を処理
      await Promise.all(
        scheduledPosts.map(async (post) => {
          await publishPost(post, env);
        })
      );
    } catch (error) {
      console.error('Scheduled execution failed:', error);
    }
  },
};
