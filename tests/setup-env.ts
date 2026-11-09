// Tests use a SEPARATE database so they never touch your dev data.
import "dotenv/config";

const testUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54329/reelbhai_test";
process.env.DATABASE_URL = testUrl;
process.env.DIRECT_URL = testUrl;
process.env.PAYMENTS_MODE = "mock";
process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
process.env.APP_SECRET ??= "test-secret";
process.env.RESEND_API_KEY = ""; // never send real email from tests
process.env.MAIL_SILENT = "1";
