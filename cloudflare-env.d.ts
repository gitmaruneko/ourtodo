declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    AUTH_MODE?: string;
    LINE_CHANNEL_ID?: string;
    LINE_LIFF_ID?: string;
    LINE_ADMIN_USER_ID?: string;
  }
}
