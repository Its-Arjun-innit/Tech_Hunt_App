import type { MetadataRoute } from "next";

/** Lets students "Add to home screen" and open the app full screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Campus",
    short_name: "Campus",
    description: "Timetable, attendance and notices.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
