import PocketBase from "pocketbase";
import dotenv from "dotenv";
import { readFile } from "fs/promises";

dotenv.config();

const { POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD } =
  process.env;

const findRawData = async (p = "raw/sejm.blob") => {
  const text = await readFile(p, "utf-8");
  return text;
};

(async () => {
  const pb = new PocketBase({
    url: POCKETBASE_URL,
    adminEmail: POCKETBASE_ADMIN_EMAIL,
    adminPassword: POCKETBASE_ADMIN_PASSWORD,
  });
  // await findRawData();
  // console.log(process.env);
  // console.log({ blob });
  const resultList = await pb.collection("regions").getList(1, 50, {
    filter: 'created >= "2022-01-01 00:00:00" && someField1 != someField2',
  });
  console.log({ resultList });
  process.exit(0);
})();
