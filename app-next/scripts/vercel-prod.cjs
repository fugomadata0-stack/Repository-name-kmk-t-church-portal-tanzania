/**

 * Deploy production to Vercel (`npx vercel --prod --force`).

 *

 * Utaratibu wa TLS (bora → mbaya):

 *  1) Node.js 22+: --use-system-ca kwa mchakato huu (hifadhi ya Windows/macOS/Linux).

 *  2) NODE_EXTRA_CA_CERTS = kamili path ya PEM ya CA ya kampuni (Node yoyote).

 *  3) Mwisho tu: VERCEL_USE_INSECURE_TLS=1 au KMKT_VERCEL_INSECURE_TLS=1

 *     (NODE_TLS_REJECT_UNAUTHORIZED=0 — hatari, muda mfupi pekee).

 *

 * Windows + Node chini ya 22 + SSL inspection:

 *   npm run deploy:vercel:prod:win   (kutoka mizizi — inachanganya windows-node-tls.ps1)

 *   au:  . .\scripts\windows-node-tls.ps1 -CorporateCaPem "C:\corp\ca.pem"

 *

 * PowerShell (hatari):  $env:VERCEL_USE_INSECURE_TLS = "1"; npm run deploy:vercel:prod

 * cmd (hatari):         set VERCEL_USE_INSECURE_TLS=1 && npm run deploy:vercel:prod

 */



const { spawnSync } = require("child_process");

const path = require("path");



const root = path.resolve(__dirname, "..");

const passthrough = process.argv.slice(2);



const insecure =

  process.env.VERCEL_USE_INSECURE_TLS === "1" ||

  /^true$/i.test(String(process.env.VERCEL_USE_INSECURE_TLS || "").trim()) ||

  process.env.KMKT_VERCEL_INSECURE_TLS === "1";



function nodeMajor() {

  const m = /^v?(\d+)/.exec(String(process.versions.node || ""));

  return m ? parseInt(m[1], 10) : 0;

}



/** @param {NodeJS.ProcessEnv} env */

function augmentEnvForTls(env) {

  const next = { ...env };



  if (insecure) {

    console.warn("");

    console.warn("  ⚠  VERCEL_USE_INSECURE_TLS=1 — uthibitishaji wa TLS umezimwa kwa mchakato huu wa Node pekee.");

    console.warn("     Tumia tu unapohitajika (proxy/SSL inspection). Ondoa mazingira baada ya deploy.");

    console.warn("");

    next.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    return next;

  }



  const major = nodeMajor();

  const flag = "--use-system-ca";

  if (major >= 22) {

    const cur = String(next.NODE_OPTIONS || "").trim();

    const parts = cur.split(/\s+/).filter(Boolean);

    if (!parts.includes(flag)) {

      next.NODE_OPTIONS = cur ? `${cur} ${flag}` : flag;

      console.log(`[vercel-prod] Node ${major}: NODE_OPTIONS += ${flag} (TLS kwa hifadhi ya mfumo)`);

    }

  }



  if (next.NODE_EXTRA_CA_CERTS) {

    console.log(`[vercel-prod] NODE_EXTRA_CA_CERTS imewekwa (CA za ziada kwa TLS).`);

  } else if (major > 0 && major < 22) {

    console.log(

      "[vercel-prod] Node 21 au chini: jaribu Node 22+ (--use-system-ca) au weka NODE_EXTRA_CA_CERTS kwa PEM ya kampuni; au npm run deploy:vercel:prod:win (Windows)."

    );

  }



  return next;

}



const args = ["vercel", "--prod", "--force", ...passthrough];

const r = spawnSync("npx", args, {

  stdio: "inherit",

  shell: true,

  cwd: root,

  env: augmentEnvForTls(process.env),

});



process.exit(r.status === null ? 1 : r.status);


