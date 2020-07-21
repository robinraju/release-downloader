import {download} from "../src/download"

test("run download", async () => {
  await download("test.zip", "./",  "")
})
