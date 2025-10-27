import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai@^4.20.0";
import { SYSTEM_PROMPT } from "./prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};


Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  let jobId: string | undefined;

  try {
    const body = await req.json();
    jobId = body.jobId;

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "jobId is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Return immediately and process in background
    const response = new Response(
      JSON.stringify({
        success: true,
        jobId,
        message: "Job started, processing in background"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

    // Process job in background (don't await)
    processJobInBackground(jobId).catch(error => {
      console.error(`[Job ${jobId}] Background processing failed:`, error);
    });

    return response;
  } catch (error) {
    console.error(`[Job ${jobId}] ✗ Job failed:`, error);

    if (jobId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from("inspection_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", jobId);

      const { data: job } = await supabase
        .from("inspection_jobs")
        .select("collection_result_id")
        .eq("id", jobId)
        .maybeSingle();

      if (job) {
        await supabase
          .from("collection_results")
          .update({ current_job_id: null })
          .eq("id", job.collection_result_id);
      }
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function processJobInBackground(jobId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const openai = new OpenAI({ apiKey: openaiApiKey });

  console.log(`[Job ${jobId}] Starting inspection job...`);

  const { data: job, error: jobError } = await supabase
    .from("inspection_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    console.error(`[Job ${jobId}] Job not found:`, jobError);
    throw new Error("Job not found");
  }

  await supabase
    .from("inspection_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  console.log(`[Job ${jobId}] Job type: ${job.job_type}`);

  // Get approved icons URL
  const { data: config } = await supabase
    .from("system_config")
    .select("config_value")
    .eq("config_key", "approved_icons_image_url")
    .maybeSingle();

  const approvedIconsUrl = config?.config_value
    ? `https://kfsawswzupmullhwrypa.supabase.co/storage/v1/object/public/banner-assets/${config.config_value}`
    : null;

  console.log(`[Job ${jobId}] Approved icons URL: ${approvedIconsUrl}`);

  let bannersToProcess: any[] = [];

  if (job.job_type === "single_banner" && job.banner_id) {
    const { data: banner } = await supabase
      .from("banners")
      .select("*")
      .eq("id", job.banner_id)
      .single();

    if (banner) {
      bannersToProcess = [banner];
    }
  } else if (job.job_type === "all_banners") {
    const { data: banners } = await supabase
      .from("banners")
      .select("*")
      .eq("collection_result_id", job.collection_result_id);

    bannersToProcess = banners || [];
  }

  console.log(`[Job ${jobId}] Processing ${bannersToProcess.length} banner(s)`);

  let passedCount = 0;

  // Process banners in batches of 3 (parallel processing)
  const batchSize = 3;
  
  for (let i = 0; i < bannersToProcess.length; i += batchSize) {
    const batch = bannersToProcess.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(bannersToProcess.length / batchSize);
    
    console.log(`[Job ${jobId}] Processing batch ${batchNumber}/${totalBatches} (${batch.length} banners)`);
    
    // Process batch in parallel using Promise.allSettled
    const batchResults = await Promise.allSettled(
      batch.map(banner => processBanner(banner, jobId, supabase, openai, approvedIconsUrl))
    );
    
    // Count passed banners
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value === true) {
        passedCount++;
      } else if (result.status === 'rejected') {
        console.error(`[Job ${jobId}] Banner processing failed:`, result.reason);
      }
    }
    
    console.log(`[Job ${jobId}] Batch ${batchNumber}/${totalBatches} completed`);
  }


  // Update collection status
  const { data: allBanners } = await supabase
    .from("banners")
    .select("id")
    .eq("collection_result_id", job.collection_result_id);

  const allInspectionResults = await Promise.all(
    (allBanners || []).map((b) =>
      supabase
        .from("inspection_results")
        .select("banner_inspection_report")
        .eq("banner_id", b.id)
        .maybeSingle()
    )
  );

  const totalInspected = allInspectionResults.filter(
    ({ data }) => data !== null
  ).length;
  const totalBanners = allBanners?.length || 0;
  const newStatus =
    totalInspected === totalBanners
      ? "inspected"
      : totalInspected > 0
      ? "inspecting"
      : "not_inspected";

  const totalPassedCount = allInspectionResults.filter(({ data }) => {
    if (!data) return false;
    const report = data.banner_inspection_report;
    return (
      (report?.desktop?.overallStatus === "적합" || report?.desktop?.overallStatus === "준수") &&
      (report?.mobile?.overallStatus === "적합" || report?.mobile?.overallStatus === "준수")
    );
  }).length;

  await supabase
    .from("collection_results")
    .update({
      inspection_status: newStatus,
      passed_count: totalPassedCount,
      current_job_id: null,
    })
    .eq("id", job.collection_result_id);

  await supabase
    .from("inspection_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      progress_current: bannersToProcess.length,
    })
    .eq("id", jobId);

  console.log(`[Job ${jobId}] ✓ Job completed successfully - ${passedCount}/${bannersToProcess.length} banners passed`);
}

async function processBanner(banner: any, jobId: string, supabase: any, openai: any, approvedIconsUrl: string | null): Promise<boolean> {
  console.log(`[Job ${jobId}] Processing banner: ${banner.title}`);

  try {
    // Create job log entry
    await supabase.from("inspection_job_logs").insert({
      job_id: jobId,
      banner_id: banner.id,
      status: "processing",
      created_at: new Date().toISOString(),
    });

    // Get banner images
    const desktopImageUrl = banner.image_desktop;
    const mobileImageUrl = banner.image_mobile;

    if (!desktopImageUrl || !mobileImageUrl) {
      throw new Error("Banner images not available");
    }

    console.log(`[Job ${jobId}] Desktop image: ${desktopImageUrl}`);
    console.log(`[Job ${jobId}] Mobile image: ${mobileImageUrl}`);

    // Prepare content parts for OpenAI
    const contentParts: any[] = [
      {
        type: "text",
        text: `다음 자료를 바탕으로 웹 배너 검수를 수행해주세요:

## 입력 자료

**1. HTML 코드:**`
      },
      {
        type: "text",
        text: banner.html_code // 실제 HTML 코드 삽입
      },
      {
        type: "text",
        text: "**2. PC 배경 이미지:**"
      },
      {
        type: "image_url",
        image_url: { 
          url: desktopImageUrl,
          detail: "high"
        }
      },
      {
        type: "text",
        text: "**3. 모바일 배경 이미지:**"
      },
      {
        type: "image_url",
        image_url: { 
          url: mobileImageUrl,
          detail: "high"
        }
      },
      {
        type: "text",
        text: "**4. 승인된 아이콘 목록 이미지:**"
      },
      {
        type: "image_url",
        image_url: { 
          url: approvedIconsUrl,
          detail: "high"
        }
      },
      {
        type: "text",
        text: "\n\n위의 모든 입력 자료를 바탕으로 웹 배너 검수를 수행하고 JSON 형식으로 결과를 출력해주세요."
      }
    ];

    console.log(`[Job ${jobId}] Calling OpenAI API...`);

    const startTime = Date.now();
    
    let completion;
    let result;
    try {
      completion = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            {
              role: "system",
              content: [{ type: "text", text: SYSTEM_PROMPT }],
            },
            {
              role: "user",
              content: contentParts,
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 4096,
          temperature: 0.1,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("OpenAI API timeout after 150 seconds")), 150000)
        ),
      ]);

      const responseTime = Date.now() - startTime;
      console.log(`[Job ${jobId}] OpenAI response received (${responseTime}ms)`);

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("No response from OpenAI");
      }

      console.log(`[Job ${jobId}] Response length: ${responseText.length} chars`);

      console.log(`[Job ${jobId}] Parsing JSON response...`);
      result = JSON.parse(responseText);
      console.log(`[Job ${jobId}] JSON parsed successfully, saving to database...`);
    } catch (error) {
      console.error(`[Job ${jobId}] ❌ OpenAI API Error:`, error);
      console.error(`[Job ${jobId}] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
      console.error(`[Job ${jobId}] Error message:`, error instanceof Error ? error.message : String(error));
      console.error(`[Job ${jobId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }

    // Check if inspection result already exists
    const { data: existingInspection } = await supabase
      .from("inspection_results")
      .select("id")
      .eq("banner_id", banner.id)
      .maybeSingle();

    if (existingInspection) {
      console.log(`[Job ${jobId}] Updating existing inspection result...`);
      const { data: updateData, error: updateError } = await supabase
        .from("inspection_results")
        .update({
          banner_inspection_report: result.bannerInspectionReport,
          inspected_at: new Date().toISOString(),
        })
        .eq("banner_id", banner.id);
      
      if (updateError) {
        console.error(`[Job ${jobId}] Failed to update inspection result:`, updateError);
        throw updateError;
      }
      console.log(`[Job ${jobId}] Inspection result updated successfully`);
    } else {
      console.log(`[Job ${jobId}] Creating new inspection result...`);
      const { data: insertData, error: insertError } = await supabase.from("inspection_results").insert({
        banner_id: banner.id,
        banner_inspection_report: result.bannerInspectionReport,
        inspected_at: new Date().toISOString(),
      });
      
      if (insertError) {
        console.error(`[Job ${jobId}] Failed to insert inspection result:`, insertError);
        throw insertError;
      }
      console.log(`[Job ${jobId}] Inspection result inserted successfully`);
    }

    const isPassed =
      (result.bannerInspectionReport?.desktop?.overallStatus === "적합" || 
       result.bannerInspectionReport?.desktop?.overallStatus === "준수") &&
      (result.bannerInspectionReport?.mobile?.overallStatus === "적합" || 
       result.bannerInspectionReport?.mobile?.overallStatus === "준수");

    console.log(`[Job ${jobId}] Inspection completed - Desktop: ${result.bannerInspectionReport?.desktop?.overallStatus}, Mobile: ${result.bannerInspectionReport?.mobile?.overallStatus}`);

    // Update job log
    await supabase
      .from("inspection_job_logs")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("job_id", jobId)
      .eq("banner_id", banner.id);

    console.log(`[Job ${jobId}] ✓ Completed banner: ${banner.title} (${isPassed ? "PASSED" : "FAILED"})`);

    return isPassed;

  } catch (error) {
    console.error(`[Job ${jobId}] ✗ Failed to process banner ${banner.title}:`, error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    let skipReason: string | null = null;
    let shouldSkip = false;

    if (errorMessage.includes('image') || errorMessage.includes('format') || errorMessage.includes('unsupported')) {
      shouldSkip = true;

      if (errorMessage.toLowerCase().includes('unsupported') && errorMessage.toLowerCase().includes('format')) {
        skipReason = 'unsupported_image_format';
      } else if (errorMessage.toLowerCase().includes('size') || errorMessage.toLowerCase().includes('large')) {
        skipReason = 'image_too_large';
      } else if (errorMessage.toLowerCase().includes('not accessible') || errorMessage.toLowerCase().includes('404') || errorMessage.toLowerCase().includes('403')) {
        skipReason = 'image_not_accessible';
      } else {
        skipReason = 'api_image_error';
      }
    }

    if (shouldSkip) {
      console.log(`[Job ${jobId}] ⏭️ Skipping banner due to image issue: ${skipReason}`);

      await supabase
        .from("inspection_job_logs")
        .update({
          status: "skipped",
          skip_reason: skipReason,
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("job_id", jobId)
        .eq("banner_id", banner.id);
    } else {
      await supabase
        .from("inspection_job_logs")
        .update({
          status: "failed",
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("job_id", jobId)
        .eq("banner_id", banner.id);
    }
    
    throw error; // Re-throw to let Promise.allSettled handle it
  }
}

function extractBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    return "";
  }
}