import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LectureMaterial {
  id: string;
  material_url: string;
  material_name: string;
  material_type: string;
  source_type: string;
  storage_path: string | null;
  file_mime: string | null;
}

interface Lecture {
  id: string;
  title: string;
  script_prompt: string;
  video_length: number;
  content_style: string[];
}

async function fetchMaterialContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch material from ${url}: ${response.status}`);
      return "";
    }

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/pdf")) {
      return "[PDF content - requires parsing]";
    } else if (contentType?.includes("text")) {
      return await response.text();
    } else {
      return "[Binary content]";
    }
  } catch (error) {
    console.error(`Error fetching material from ${url}:`, error);
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const lectureId = pathParts[pathParts.length - 2];

    if (!lectureId) {
      return new Response(
        JSON.stringify({ error: "Lecture ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`[generate-script] Processing lecture: ${lectureId}`);

    const { data: lecture, error: lectureError } = await supabaseClient
      .from("lectures")
      .select("id, title, script_prompt, video_length, content_style")
      .eq("id", lectureId)
      .maybeSingle();

    if (lectureError || !lecture) {
      console.error("[generate-script] Lecture not found:", lectureError);
      return new Response(
        JSON.stringify({ error: "Lecture not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: materials, error: materialsError } = await supabaseClient
      .from("lecture_materials")
      .select("id, material_url, material_name, material_type, source_type, storage_path, file_mime")
      .eq("lecture_id", lectureId)
      .in("source_type", ["course_preloaded", "uploaded"]);

    if (materialsError) {
      console.error("[generate-script] Error fetching materials:", materialsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch materials" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const mainMaterials = materials?.filter(m => m.material_type === "main") || [];
    const backgroundMaterials = materials?.filter(m => m.material_type === "background") || [];

    console.log(`[generate-script] Lecture: ${lecture.title}`);
    console.log(`[generate-script] Main materials: ${mainMaterials.length}`);
    console.log(`[generate-script] Background materials: ${backgroundMaterials.length}`);
    console.log(`[generate-script] Main materials breakdown:`, mainMaterials.map(m => ({
      name: m.material_name,
      source: m.source_type,
      type: m.file_mime
    })));
    console.log(`[generate-script] Background materials breakdown:`, backgroundMaterials.map(m => ({
      name: m.material_name,
      source: m.source_type,
      type: m.file_mime
    })));

    const materialContents: { [key: string]: string } = {};

    for (const material of [...mainMaterials, ...backgroundMaterials]) {
      console.log(`[generate-script] Fetching content for: ${material.material_name} (${material.source_type})`);
      const content = await fetchMaterialContent(material.material_url);
      materialContents[material.id] = content;
    }

    const scriptContext = {
      title: lecture.title,
      prompt: lecture.script_prompt,
      videoLength: lecture.video_length,
      contentStyle: lecture.content_style,
      mainMaterials: mainMaterials.map(m => ({
        name: m.material_name,
        sourceType: m.source_type,
        content: materialContents[m.id] || "",
      })),
      backgroundMaterials: backgroundMaterials.map(m => ({
        name: m.material_name,
        sourceType: m.source_type,
        content: materialContents[m.id] || "",
      })),
    };

    console.log(`[generate-script] Total materials included: ${mainMaterials.length + backgroundMaterials.length}`);

    const script = `
# Generated Lecture Script for "${lecture.title}"

## Context
- Video Length: ${lecture.video_length} minutes
- Content Style: ${lecture.content_style.join(", ")}
- Main Materials: ${mainMaterials.length}
- Background Materials: ${backgroundMaterials.length}

## Prompt
${lecture.script_prompt}

## Main Materials Used
${mainMaterials.map(m => `- ${m.material_name} (${m.source_type})`).join("\n")}

## Background Materials Used
${backgroundMaterials.map(m => `- ${m.material_name} (${m.source_type})`).join("\n")}

## Script Content
This is a placeholder script. In a production environment, this would be generated using an LLM
that processes the materials listed above and creates appropriate lecture content based on the
prompt and context provided.

The script would incorporate insights from:
${mainMaterials.map((m, i) => `${i + 1}. ${m.material_name}`).join("\n")}

With additional context from:
${backgroundMaterials.map((m, i) => `${i + 1}. ${m.material_name}`).join("\n")}
    `.trim();

    console.log(`[generate-script] Script generated successfully. Length: ${script.length} characters`);

    return new Response(
      JSON.stringify({
        script,
        materialsUsed: {
          main: mainMaterials.length,
          background: backgroundMaterials.length,
          total: mainMaterials.length + backgroundMaterials.length
        }
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[generate-script] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
