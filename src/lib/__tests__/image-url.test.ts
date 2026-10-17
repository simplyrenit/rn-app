import { describe, expect, it } from "@jest/globals";
import { imageUrlOf, photoUrlOf } from "../image-url";

const photo = "https://cdn.example/uploads/2026/10/12/ab12/me.jpg";

describe("the photo of a nested user (notifications, reviews, owners)", () => {
  it("reads the server's public user image: an object with image_url for an account with a photo", () => {
    expect(imageUrlOf({ image_url: photo })).toBe(photo);
    expect(photoUrlOf({ name: "UI123", image_url: photo })).toBe(photo);
  });

  it("is no photo for an account without one (null) or for a bare empty value, so the monogram shows", () => {
    for (const none of [null, undefined, "", "  ", {}, { image_url: null }, { image_url: "" }]) expect(photoUrlOf(none)).toBeNull();
  });

  it("never throws on a value that is not a string or an image object: it is no photo (it was `uri.toLowerCase is not a function`)", () => {
    for (const odd of [5, true, [], [photo], { image_url: 7 }, { image_url: { url: photo } }, () => photo]) {
      expect(() => photoUrlOf(odd)).not.toThrow();
      expect(photoUrlOf(odd)).toBeNull();
    }
  });

  it("still takes a plain URL, as the profile photo, the owner row and the chat rows give it", () => {
    expect(photoUrlOf(photo)).toBe(photo);
  });

  it("a generic silhouette is no photo, whichever way it arrives", () => {
    expect(photoUrlOf("https://cdn.example/static/default-avatar.png")).toBeNull();
    expect(photoUrlOf({ image_url: "https://cdn.example/static/Placeholder.png" })).toBeNull();
    expect(photoUrlOf("https://cdn.example/user.png")).toBeNull();
  });
});
