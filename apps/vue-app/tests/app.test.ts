// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import App from "../src/App.vue";

describe("vue app", () => {
  it("renders the Vue wrapper", () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain("Vue integration");
    expect(wrapper.find("pixelshift-image-converter").exists()).toBe(true);
  });
});
