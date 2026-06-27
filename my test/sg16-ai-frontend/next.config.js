import type { Config } from "next";

const config: Config = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default config;
