/**
 * Grant or revoke the `admin` custom claim on a Firebase Auth user.
 *
 *   npx tsx scripts/set-admin-claim.ts <email>            # grant
 *   npx tsx scripts/set-admin-claim.ts <email> --remove   # revoke
 *   npx tsx scripts/set-admin-claim.ts <email> --show     # print current claims
 *
 * Credentials: FIREBASE_SERVICE_ACCOUNT_JSON, the FIREBASE_* vars, or Application
 * Default Credentials (`gcloud auth application-default login`), same as the app.
 *
 * Claims reach the browser on the next ID-token refresh: sign out and back in after
 * running this. Revoking also revokes refresh tokens so existing sessions end.
 */
import 'dotenv/config';

import adminConfig from '../config/firebase-admin';

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email || !email.includes('@')) {
    console.error('Usage: npx tsx scripts/set-admin-claim.ts <email> [--remove|--show]');
    process.exit(2);
  }

  const auth = adminConfig.getAuth();
  const user = await auth.getUserByEmail(email);
  const current = { ...(user.customClaims ?? {}) };

  if (flag === '--show') {
    console.log(JSON.stringify({ uid: user.uid, email: user.email, claims: current }, null, 2));
    return;
  }

  if (flag === '--remove') {
    delete current.admin;
    await auth.setCustomUserClaims(user.uid, current);
    await auth.revokeRefreshTokens(user.uid);
    console.log(`Removed admin from ${email} (${user.uid}); sessions revoked.`);
    return;
  }

  if (flag) {
    console.error(`Unknown flag ${flag}`);
    process.exit(2);
  }

  await auth.setCustomUserClaims(user.uid, { ...current, admin: true });
  console.log(`Granted admin to ${email} (${user.uid}). Sign out and back in to pick it up.`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
