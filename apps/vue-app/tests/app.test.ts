// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { ImageConverter } from "pixelshift-vue";
import App from "../src/App.vue";

describe("vue app", () => {
  it("renders the Vue wrapper", () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain("Vue integration");
    expect(wrapper.find("pixelshift-studio").exists()).toBe(true);
  });

  it("keeps exposing the converter's convert() on its ref", () => {
    const wrapper = mount(ImageConverter);
    const handle = wrapper.vm as unknown as Record<string, unknown>;
    expect(handle.convert).toBeTypeOf("function");
    expect(handle.process).toBeTypeOf("function");
  });
});
