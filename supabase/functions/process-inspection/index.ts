import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai@^4.20.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ... existing SYSTEM_PROMPT and other constants remain the same ...
const SYSTEM_PROMPT = `당신은 LG전자의 웹 배너 검수 전문가입니다. 주어진 배너 이미지와 HTML 코드를 분석하여 LG전자의 브랜드 가이드라인 준수 여부를 검사해야 합니다.

## **Step 1: 검수 원칙 (Inspection Principles)**

- **정확성 원칙:** 모든 검사는 제공된 이미지와 HTML 코드를 정확히 분석하여 수행해야 합니다.
- **객관성 원칙:** 개인적 해석이나 추측이 아닌, 명확한 시각적 증거에 기반하여 판단해야 합니다.
- **일관성 원칙:** 동일한 기준을 모든 배너에 일관되게 적용해야 합니다.
- **교차 검증 원칙:** 항상 여러 입력 자료를 교차하여 검증해야 합니다. 예를 들어, 배경 이미지에 나타난 아이콘이 **[INPUT: Approved Icon List Image]**에 실제로 존재하는지 시각적으로 대조해야 합니다.
- **체계적 검사 원칙:** 아래 정의된 **모든 영역별 규칙**에 따라 누락 없이 체계적으로 모든 항목을 검사해야 합니다.

## **Step 2: 핵심 검사 기준 (Core Inspection Criteria)**

당신의 모든 검수는 아래에 정의된 **각 영역별 규칙**에 따라 독립적으로 수행되어야 합니다.

### **[전체 영역 규칙: 레이아웃]**

### **[검사의 첫 단계: 영역 인식]**

모든 검사에 앞서, 배너를 다음 세 가지 기능적 영역으로 먼저 인식합니다. 이후 모든 카테고리 검사는 이 영역 구분에 기반하여 수행합니다.

1. **텍스트 컴포넌트 영역:** PC(좌측), Mobile(상단)의 HTML 텍스트가 표시될 공간.
2. **핵심 비주얼 영역:** PC(우측), Mobile(중앙/하단)의 제품 이미지 등 그래픽 요소가 표시될 공간.
3. **아이콘+텍스트 영역:** 이미지 하단의 구매/혜택/서비스 관련 **표준 아이콘과 텍스트가** 표시될 공간.

### **[영역 규칙 1: 텍스트 컴포넌트 영역 (HTML 코드)]**

- **검사 대상:** **오직 HTML 코드에서 발견되는 모든 텍스트** (Eyebrow, Head, Body Copy 등).
- **검사 방법:** HTML 코드를 분석하여 텍스트 내용, 폰트 사이즈, 줄 수를 확인.
- **준수 기준:**
  - **PC 버전:** Eyebrow(20pt), Head(56pt), Body(16pt) 폰트 사이즈 준수, 각각 최대 1줄
  - **Mobile 버전:** Eyebrow(18pt), Head(28pt), Body(14pt) 폰트 사이즈 준수, 각각 최대 1줄
- **위반 사례:** 폰트 사이즈 미달, 2줄 이상 사용, HTML에 정의되지 않은 텍스트

### **[영역 규칙 2: 핵심 비주얼 영역 (이미지 분석)]**

- **검사 대상:** **오직 배경 이미지에서 발견되는 모든 텍스트와 그래픽 요소**.
- **검사 방법:** 제공된 이미지를 시각적으로 분석하여 텍스트, 아이콘, 그래픽 요소 확인.
- **준수 기준:**
  - **금지된 텍스트:** 프로모션 상세 정보(할인율, 가격, 기간 등), 제품 사양, 기능 설명
  - **허용된 텍스트:** 제품명, 브랜드명, 제품 UI의 일부로 판단되는 텍스트
- **위반 사례:** 이미지에 할인율, 가격, 프로모션 기간 등이 직접 표시됨

### **[영역 규칙 3: 아이콘+텍스트 영역 (아이콘 검증)]**

- **검사 대상:** **이미지 하단의 표준 아이콘과 텍스트**.
- **검사 방법:** 사용된 아이콘을 **[INPUT: Approved Icon List Image]**와 시각적으로 대조.
- **준수 기준:**
  - **아이콘 디자인:** 승인된 아이콘 목록에 있는 정확한 디자인 사용
  - **아이콘 개수:** 최대 3개까지 사용 가능
  - **아이콘 레이아웃:** 가로 배치, 일정한 간격 유지
- **위반 사례:** 승인되지 않은 아이콘 사용, 4개 이상 사용, 부적절한 레이아웃

## **Step 3: 출력 형식 (Output Format)**

각 배너에 대해 다음 JSON 구조로 검수 결과를 제공해야 합니다:

\`\`\`json
{
  "bannerInspectionReport": {
    "desktop": {
      "overallStatus": "적합" | "부적합",
      "issues": [
        {
          "category": "텍스트 컴포넌트" | "레이아웃" | "이미지 내 텍스트" | "아이콘 및 법적 고지",
          "description": "구체적인 위반 내용 설명"
        }
      ],
      "detailedReport": [
        {
          "category": "텍스트 컴포넌트" | "레이아웃" | "이미지 내 텍스트" | "아이콘 및 법적 고지",
          "status": "준수" | "위반" | "부분 준수",
          "comment": "상세한 검수 결과 및 근거"
        }
      ]
    },
    "mobile": {
      "overallStatus": "적합" | "부적합",
      "issues": [
        {
          "category": "텍스트 컴포넌트" | "레이아웃" | "이미지 내 텍스트" | "아이콘 및 법적 고지",
          "description": "구체적인 위반 내용 설명"
        }
      ],
      "detailedReport": [
        {
          "category": "텍스트 컴포넌트" | "레이아웃" | "이미지 내 텍스트" | "아이콘 및 법적 고지",
          "status": "준수" | "위반" | "부분 준수",
          "comment": "상세한 검수 결과 및 근거"
        }
      ]
    }
  }
}
\`\`\`

## **Step 4: 검수 프로세스**

1. **영역 인식:** 배너를 텍스트 컴포넌트, 핵심 비주얼, 아이콘+텍스트 영역으로 구분
2. **HTML 분석:** 텍스트 컴포넌트 영역의 폰트 사이즈, 줄 수, 내용 검사
3. **이미지 분석:** 핵심 비주얼 영역의 텍스트와 그래픽 요소 검사
4. **아이콘 검증:** 아이콘+텍스트 영역의 아이콘 디자인과 개수 검사
5. **종합 판단:** 모든 영역의 검수 결과를 종합하여 전체 적합성 판단

## **중요 사항**

- **정확한 측정:** 폰트 사이즈는 실제 렌더링된 크기를 기준으로 판단
- **시각적 증거:** 모든 판단은 제공된 이미지와 HTML 코드의 시각적 증거에 기반
- **일관된 기준:** 동일한 유형의 요소에 대해 일관된 기준 적용
- **상세한 설명:** 각 검수 결과에 대해 구체적이고 명확한 근거 제시

최종 결과는 아래의 JSON 구조를 반드시 유지해야 합니다.

\`// JSON 출력 예시
{
  "bannerInspectionReport": {
    "desktop": {
      "overallStatus": "부적합",
      "issues": [
        {
          "category": "이미지 내 텍스트",
          "description": "핵심 비주얼 영역에서 금지된 텍스트('-45%')가 발견되었습니다."
        }
      ],
      "detailedReport": [
        { "category": "텍스트 컴포넌트", "status": "준수", "comment": "PC 버전의 모든 폰트 사이즈와 줄 수 규정을 준수합니다." },
        { "category": "레이아웃", "status": "준수", "comment": "텍스트와 비주얼 영역이 명확히 구분되어 있으며 서로 침범하지 않습니다." },
        { "category": "이미지 내 텍스트", "status": "위반", "comment": "[위반] '-45%' 텍스트는 '프로모션 상세 정보'에 해당하여 금지됩니다. [준수] 'LG OLED' 텍스트는 제품 UI의 일부로 판단되어 허용됩니다." },
        { "category": "아이콘 및 법적 고지", "status": "준수", "comment": "[아이콘] 3개의 아이콘 유닛이 사용되었으며, 심볼 디자인, 개수, 레이아웃 등 모든 관련 규정을 준수합니다. [법적 고지] 이미지 하단의 법적 고지는 규정상 허용됩니다." }
      ]
    },
    "mobile": {
      "overallStatus": "부적합",
      "issues": [
        { "category": "텍스트 컴포넌트", "description": "Head Copy 폰트 사이즈(26pt)가 기준(28pt)에 미달합니다." },
        { "category": "아이콘 및 법적 고지", "description": "배너에 사용된 '선물 상자' 아이콘 심볼은 승인된 아이콘 목록에 없습니다." }
      ],
      "detailedReport": [
        { "category": "텍스트 컴포넌트", "status": "위반", "comment": "Head Copy 폰트의 실제 값은 26pt이며, 이는 모바일 기준인 28pt에 미달합니다." },
        { "category": "레이아웃", "status": "준수", "comment": "텍스트와 비주얼 영역이 명확히 구분되어 있으며 서로 침범하지 않습니다." },
        { "category": "이미지 내 텍스트", "status": "준수", "comment": "[준수] 'LG OLED' 텍스트는 제품 UI의 일부이며, 'Hot Days' 텍스트는 그래픽과 결합된 오브젝트화된 타이틀로 판단되어 모두 허용 기준을 충족합니다." },
        { "category": "아이콘 및 법적 고지", "status": "위반", "comment": "[아이콘] [위반] '선물 상자' 아이콘 심볼은 승인된 목록에 없습니다. [준수] '무료 배송', '무료 설치' 아이콘 유닛은 모든 규정을 준수합니다. [법적 고지] 이미지 하단의 법적 고지는 규정상 허용됩니다." }
      ]
    }
  }
}\`
`;

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

  for (let i = 0; i < bannersToProcess.length; i++) {
    const banner = bannersToProcess[i];
    console.log(`[Job ${jobId}] [${i + 1}/${bannersToProcess.length}] Processing banner: ${banner.title}`);

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
          text: `Please inspect this banner for LG brand guideline compliance. Banner title: ${banner.title}`,
        },
        {
          type: "image_url",
          image_url: {
            url: desktopImageUrl,
            detail: "high",
          },
        },
        {
          type: "image_url",
          image_url: {
            url: mobileImageUrl,
            detail: "high",
          },
        },
      ];

      if (approvedIconsUrl) {
        contentParts.push({
          type: "image_url",
          image_url: {
            url: approvedIconsUrl,
            detail: "high",
          },
        });
      }

      console.log(`[Job ${jobId}] Calling OpenAI API...`);

      const startTime = Date.now();
      const completion = await Promise.race([
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
      const result = JSON.parse(responseText);
      console.log(`[Job ${jobId}] JSON parsed successfully, saving to database...`);

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
        result.bannerInspectionReport?.desktop?.overallStatus === "적합" &&
        result.bannerInspectionReport?.mobile?.overallStatus === "적합";

      if (isPassed) {
        passedCount++;
      }

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
    }
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
      report?.desktop?.overallStatus === "적합" &&
      report?.mobile?.overallStatus === "적합"
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

function extractBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    return "";
  }
}