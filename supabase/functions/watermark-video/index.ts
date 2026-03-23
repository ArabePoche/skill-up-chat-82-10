const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildWatermarkFilter(authorName: string, watermarkText: string) {
  const text = waterfallEscape(watermarkText);
  const author = waterfallEscape(authorName);
  return [`scale='min(1280,iw)':-2`,
    `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${text}':` +
      `fontsize=26:fontcolor=white@0.85:x=w-tw-20:y=h-th-20:box=1:boxcolor=black@0.4:boxborderw=8`,
    `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='@${author}':` +
      `fontsize=20:fontcolor=white@0.7:x=w-tw-20:y=h-th-60:box=1:boxcolor=black@0.4:boxborderw=8`].join(',');
}

function waterfallEscape(str: string): string {
  return str.replace(/'/g, "\\'").replace(/:/g, '\\:').replace(/,/g, '\\,');
}

async function downloadURLToTempFile(url: string, filePath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);

  const buffer = new Uint8Array(await response.arrayBuffer());
  await Deno.writeFile(filePath, buffer);
}

async function cleanTemp(...paths: string[]) {
  for (const p of paths) {
    try {
      await Deno.remove(p);
    } catch {
      // ignore
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { videoUrl, authorName = 'EducaTok', watermarkText = 'EducaTok', outputFormat = 'mp4' } = await req.json();
    if (!videoUrl) {
      return new Response(JSON.stringify({ error: 'videoUrl is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const uid = crypto.randomUUID();
    const inputPath = `/tmp/vw-input-${uid}.tmp`;
    const outputPath = `/tmp/vw-output-${uid}.${outputFormat}`;

    await downloadURLToTempFile(videoUrl, inputPath);

    const filter = buildWatermarkFilter(authorName, watermarkText);

    const process = Deno.run({
      cmd: [
        'ffmpeg',
        '-y',
        '-i',
        inputPath,
        '-vf',
        filter,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '24',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        outputPath,
      ],
      stdout: 'piped',
      stderr: 'piped',
    });

    const status = await process.status();
    const rawError = new TextDecoder().decode(await process.stderrOutput());
    process.close();

    if (!status.success) {
      await cleanTemp(inputPath, outputPath);
      return new Response(JSON.stringify({ error: 'ffmpeg failed', details: rawError }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const outputData = await Deno.readFile(outputPath);
    const outputType = outputFormat === 'mp4' ? 'video/mp4' : outputFormat === 'webm' ? 'video/webm' : 'application/octet-stream';

    await cleanTemp(inputPath, outputPath);

    return new Response(outputData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': outputType,
        'Content-Disposition': `attachment; filename=watermarked-${uid}.${outputFormat}`,
      },
    });
  } catch (error) {
    console.error('watermark-video error', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
