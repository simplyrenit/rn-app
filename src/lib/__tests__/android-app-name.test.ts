import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

// A phone with the debug and the QA build showed two apps called "Renit", and the
// DigiLocker return offered both by that name (ENG-280). Each build type names itself.
const appName = (sourceSet: string) => {
  const xml = readFileSync(join(__dirname, "../../../android/app/src", sourceSet, "res/values/strings.xml"), "utf8");
  return /<string name="app_name">([^<]*)<\/string>/.exec(xml)?.[1];
};

describe("the Android app name", () => {
  it("is Renit for the store build, and says which build otherwise", () => {
    expect(appName("main")).toBe("Renit");
    expect(appName("debug")).toBe("Renit Dev");
    expect(appName("qa")).toBe("Renit QA");
  });
});
