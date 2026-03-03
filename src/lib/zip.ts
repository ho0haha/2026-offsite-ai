import JSZip from "jszip";

type BundleFile = {
  path: string;
  content: string;
  encoding: "utf-8" | "base64";
};

type Bundle = {
  challengeNumber: number;
  files: BundleFile[];
};

export async function bundleToZip(bundle: Bundle): Promise<Buffer> {
  const zip = new JSZip();

  for (const file of bundle.files) {
    if (file.encoding === "base64") {
      zip.file(file.path, Buffer.from(file.content, "base64"));
    } else {
      zip.file(file.path, file.content);
    }
  }

  const buf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return buf;
}
