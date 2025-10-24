import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai@^4.20.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `## **Step 1: 목표 정의 (Mission Statement)**

당신은 웹 배너의 품질을 검수하는 QA 전문가입니다. 당신의 임무는 아래에 명시된 **'검수 대원칙'**을 항상 준수하며, 오직 **'핵심 검사 기준'**에만 근거하여 결과를 판단하고, **'결과 보고 원칙'**에 따라 그 내용을 설명하며, 최종 결과물을 지정된 **'JSON 출력 형식'**에 맞춰 생성하는 것입니다.

## **Step 1.5: 검수 대원칙 (General Inspection Principles)**

모든 검사 과정 전체를 지배하는 최상위 행동 강령입니다.

- **PC와 모바일 분리 원칙:** 데스크톱과 모바일은 완전히 별개의 검사입니다. 각각의 배경 이미지와 HTML 내의 해당 디바이스용 코드(font-w-, font-m- 등)를 기준으로 독립적으로 평가해야 합니다.
- **교차 검증 원칙:** 항상 여러 입력 자료를 교차하여 검증해야 합니다. 예를 들어, 배경 이미지에 나타난 아이콘이 **[INPUT: Approved Icon List Image]**에 실제로 존재하는지 시각적으로 대조해야 합니다.
- **체계적 검사 원칙:** 아래 정의된 **모든 영역별 규칙**에 따라 누락 없이 체계적으로 모든 항목을 검사해야 합니다.

## **Step 2: 핵심 검사 기준 (Core Inspection Criteria)**

당신의 모든 검수는 아래에 정의된 **각 영역별 규칙**에 따라 독립적으로 수행되어야 합니다.

### **[전체 영역 규칙: 레이아웃]**

### **[검사의 첫 단계: 영역 인식]**

모든 검사에 앞서, 배너를 다음 세 가지 기능적 영역으로 먼저 인식합니다. 이후 모든 카테고리 검사는 이 영역 구분에 기반하여 수행합니다.

1. **텍스트 컴포넌트 영역:** PC(좌측), Mobile(상단)의 HTML 텍스트가 표시될 공간.
2. **핵심 비주얼 영역:** PC(우측), Mobile(중앙/하단)의 제품 이미지 등 그래픽 요소가 표시될 공간.
3. **아이콘+텍스트 영역:** 이미지 하단의 구매/혜택/서비스 관련 **표준 아이콘과 텍스트가** 표시될 공간.

### **[영역 규칙 1: 텍스트 컴포넌트 영역 (HTML 코드)]**

- **검사 대상:** **오직 HTML 코드에서 발견되는 모든 텍스트** (Eyebrow, Head, Body Copy 등).
- **확인 사항:** 이 텍스트들의 폰트 사이즈와 줄 수가 가이드라인을 준수하는지 확인합니다.
- **규칙:**
    - **A-1. 폰트 사이즈:**
        - **Eyebrow:** PC 20pt, Mobile 16pt
        - **Head Copy:** PC 56pt, Mobile 28pt
        - **Body Copy:** PC 16pt, Mobile 16pt
    - **A-2. Head Copy 줄 수:** 최대 3줄.

### **[영역 규칙 2: 핵심 비주얼 영역(PC: 우측, Mobile: 중앙/하단)]**

- 이 카테고리는 **핵심 비주얼 영역**에만 적용됩니다. 판단의 핵심 질문은 **"이 텍스트가 '정보'인가, '그림의 일부'인가?"**입니다.*
- **규칙:**
    - **C-1. 절대 금지 (명백한 '정보'):**
        - 핵심 비주얼 영역에 프로모션 상세 정보 금지 (할인율, 할인가, 사은품 등)
        - 핵심 비주얼 영역에 제품 USP 및 특장점 금지 (단, 제품 자체에 인쇄/표시된 경우는 예외)
        - 핵심 비주얼 영역에 단순 마케팅 카피 금지
    - **C-2. 조건부 허용 ('그림의 일부'):**
        - 핵심 비주얼 영역**(PC: 우측, Mobile: 중앙/하단)** 외의 텍스트는 모두 허용
        - **제품 화면/UI의 일부:** 제품 표면에 인쇄되거나 화면 UI 안에 표시된 텍스트.
        - **오브젝트화된 캠페인 타이틀:** 캠페인 제목이 현수막, 리본 등과 결합하여 하나의 그래픽처럼 보이는 경우.
        - **오브젝트의 정체성:** 텍스트가 없다면 오브젝트의 의미를 알 수 없는 경우. (예: Gift Card)

### **[영역 규칙 3: 아이콘+텍스트 영역]**

- **확인 사항:** 아이콘의 심볼+텍스트 레이아웃을 확인하고 승인된 아이콘인지 확인합니다.
- **규칙:**
    - **D-1. 아이콘 유닛:**
        - **정의:** '아이콘'이란 심볼과 우측 텍스트 설명을 하나의 정보 단위로 간주합니다.
        - **규정:**
            - **개수:** 3개 이하
            - **심볼 디자인:** 승인된 디자인만 사용
            - **구성:** 왼쪽 심볼, 오른쪽 텍스트
            - 아이콘 영역 내 다른 로고 배치 불가
    - **D-2. 법적 고지:**
        - 이미지 최하단에 작게 포함된 법적 고지는 **허용**됩니다.

## **Step 3: 결과 보고 원칙 (Reporting Principles)**

### **3-1. 증거 인용 원칙 (Quote the Evidence)**

'위반' 항목을 지적할 때는, 이미지나 코드에서 **직접 발견한 구체적인 증거를 반드시 인용**해야 합니다.

### **3-2. 수치 명시 원칙 (Specify Numbers)**

폰트 사이즈처럼 수치가 관련된 규칙을 판단할 때는, **'실제 측정값'과 '가이드라인 기준값'을 함께 제시**해야 합니다.

### **3-3. 명확한 사유 설명 원칙 (Explain the Reasoning)**

모든 판정에 대해 **왜 그렇게 판단했는지에 대한 근거**를 간결하게 설명해야 합니다.

### **3-4. 전체성 원칙 (Principle of Completeness)**

detailedReport의 comment를 작성할 때는, 해당 카테고리에서 **발견된 모든 위반 및 준수 사례를 누락 없이** 구체적으로 언급해야 합니다. **"xx 등"으로 요약해서는 안 되며** 발견된 내용을 모두 나열해야 합니다.

## **Step 4: JSON 출력 형식 (Output Format)**

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

⚠️⚠️⚠️주의사항: 아이콘 우측 텍스트 레이블은 이미지 내 텍스트 검수 대상이 아닙니다.`;

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

    const { data: configData } = await supabase
      .from("system_config")
      .select("config_value")
      .eq("config_key", "approved_icons_image_url")
      .single();

    if (!configData?.config_value) {
      throw new Error("Approved icons image URL not configured");
    }

    const { data: urlData } = supabase.storage
      .from("banner-assets")
      .getPublicUrl(configData.config_value);

    const approvedIconsUrl = urlData.publicUrl;
    console.log(`[Job ${jobId}] Approved icons URL: ${approvedIconsUrl}`);

    const { data: collectionData } = await supabase
      .from("collection_results")
      .select("country_url")
      .eq("id", job.collection_result_id)
      .single();

    if (!collectionData) {
      throw new Error("Collection not found");
    }

    const baseUrl = extractBaseUrl(collectionData.country_url);

    let bannersToProcess;
    if (job.job_type === "single_banner") {
      const { data: banner } = await supabase
        .from("banners")
        .select("*")
        .eq("id", job.banner_id)
        .single();

      if (!banner) {
        throw new Error("Banner not found");
      }
      bannersToProcess = [banner];
    } else {
      const { data: banners } = await supabase
        .from("banners")
        .select("*")
        .eq("collection_result_id", job.collection_result_id)
        .order("extracted_at", { ascending: true });

      bannersToProcess = banners || [];
    }

    console.log(`[Job ${jobId}] Processing ${bannersToProcess.length} banner(s)`);

    await supabase
      .from("inspection_jobs")
      .update({ progress_total: bannersToProcess.length })
      .eq("id", jobId);

    const logEntries = bannersToProcess.map((banner) => ({
      job_id: jobId,
      banner_id: banner.id,
      status: "pending",
    }));

    await supabase.from("inspection_job_logs").insert(logEntries);

    let passedCount = 0;
    let currentIndex = 0;

    for (const banner of bannersToProcess) {
      currentIndex++;
      console.log(`[Job ${jobId}] [${currentIndex}/${bannersToProcess.length}] Processing banner: ${banner.title}`);

      try {
        await supabase
          .from("inspection_job_logs")
          .update({ status: "processing" })
          .eq("job_id", jobId)
          .eq("banner_id", banner.id);

        const desktopImageUrl = banner.image_desktop
          ? resolveImageUrl(banner.image_desktop, baseUrl)
          : null;
        const mobileImageUrl = banner.image_mobile
          ? resolveImageUrl(banner.image_mobile, baseUrl)
          : null;

        if (!desktopImageUrl && !mobileImageUrl) {
          console.log(`[Job ${jobId}] ⏭️ Skipping banner: No background images available`);

          await supabase
            .from("inspection_job_logs")
            .update({
              status: "skipped",
              skip_reason: "missing_images",
              error_message: "No desktop or mobile background images available for inspection",
              updated_at: new Date().toISOString(),
            })
            .eq("job_id", jobId)
            .eq("banner_id", banner.id);

          continue;
        }

        console.log(`[Job ${jobId}] Desktop image: ${desktopImageUrl || 'N/A'}`);
        console.log(`[Job ${jobId}] Mobile image: ${mobileImageUrl || 'N/A'}`);

        const userPromptText = `다음 자료를 바탕으로 웹 배너 검수를 수행해주세요:

### **[입력 자료 (INPUTS)]**

**1. HTML Code:**
\`\`\`html
${banner.html_code}
\`\`\``;

        const contentParts: Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
        > = [
          { type: "text", text: userPromptText },
        ];

        if (desktopImageUrl) {
          contentParts.push(
            { type: "text", text: "\n**2. PC Background Image:**" },
            { type: "image_url", image_url: { url: desktopImageUrl } }
          );
        }

        if (mobileImageUrl) {
          contentParts.push(
            {
              type: "text",
              text: desktopImageUrl
                ? "\n**3. Mobile Background Image:**"
                : "\n**2. Mobile Background Image:**",
            },
            { type: "image_url", image_url: { url: mobileImageUrl } }
          );
        }

        const imageCount = (desktopImageUrl ? 1 : 0) + (mobileImageUrl ? 1 : 0);
        contentParts.push(
          {
            type: "text",
            text: `\n**${desktopImageUrl && mobileImageUrl ? "4" : imageCount + 1}. Approved Icon List Image:**`,
          },
          { type: "image_url", image_url: { url: approvedIconsUrl } },
          {
            type: "text",
            text: "\n\n위의 모든 입력 자료를 바탕으로 웹 배너 검수를 수행하고 JSON 형식으로 결과를 출력해주세요.",
          }
        );

        console.log(`[Job ${jobId}] Calling OpenAI API...`);
        const startTime = Date.now();

        const completion = await Promise.race([
          openai.chat.completions.create({
            model: "gpt-5",
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
            setTimeout(() => reject(new Error("OpenAI API timeout after 60 seconds")), 150000)
          ),
        ]);

        const elapsed = Date.now() - startTime;
        console.log(`[Job ${jobId}] OpenAI response received (${elapsed}ms)`);

        const responseText = completion.choices[0].message.content;
        if (!responseText) {
          throw new Error("No response from OpenAI");
        }

        const result = JSON.parse(responseText);

        if (!result.bannerInspectionReport) {
          throw new Error("Invalid response format from OpenAI - missing bannerInspectionReport");
        }

        const { data: existingInspection } = await supabase
          .from("inspection_results")
          .select("id")
          .eq("banner_id", banner.id)
          .maybeSingle();

        if (existingInspection) {
          await supabase
            .from("inspection_results")
            .update({
              banner_inspection_report: result.bannerInspectionReport,
              inspected_at: new Date().toISOString(),
            })
            .eq("banner_id", banner.id);
        } else {
          await supabase.from("inspection_results").insert({
            banner_id: banner.id,
            banner_inspection_report: result.bannerInspectionReport,
            inspected_at: new Date().toISOString(),
          });
        }

        const isPassed =
          result.bannerInspectionReport?.desktop?.overallStatus === "적합" &&
          result.bannerInspectionReport?.mobile?.overallStatus === "적합";

        if (isPassed) passedCount++;

        await supabase
          .from("inspection_job_logs")
          .update({
            status: "completed",
            result_summary: isPassed ? "Passed" : "Failed",
            updated_at: new Date().toISOString(),
          })
          .eq("job_id", jobId)
          .eq("banner_id", banner.id);

        console.log(`[Job ${jobId}] ✓ Completed banner: ${banner.title} (${isPassed ? 'PASSED' : 'FAILED'})`);
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

      await supabase
        .from("inspection_jobs")
        .update({ progress_current: currentIndex })
        .eq("id", jobId);
    }

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
      if (!report) return false;
      return (
        report.desktop?.overallStatus === "적합" &&
        report.mobile?.overallStatus === "적합"
      );
    }).length;

    console.log(`[Job ${jobId}] Total passed count: ${totalPassedCount}/${totalBanners} banners`);

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

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        processed: bannersToProcess.length,
        passed: passedCount,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
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

function extractBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    return "";
  }
}

function resolveImageUrl(imageUrl: string, baseUrl: string): string | null {
  if (!imageUrl) return null;

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  if (imageUrl.startsWith("//")) {
    return `https:${imageUrl}`;
  }

  if (imageUrl.startsWith("/")) {
    return `${baseUrl}${imageUrl}`;
  }

  try {
    return new URL(imageUrl, baseUrl).href;
  } catch {
    return null;
  }
}
