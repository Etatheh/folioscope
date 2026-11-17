import type { Lang } from "./i18n";

export type LegalDocId = "terms" | "privacy" | "disclaimer";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDoc = {
  title: string;
  updated: string;
  summary: string;
  sections: LegalSection[];
};

const en: Record<LegalDocId, LegalDoc> = {
  terms: {
    title: "Terms of Service",
    updated: "November 16, 2026",
    summary:
      "These Terms govern your access to and use of Markets, including its dashboards, market data, backtesting tools and AI features.",
    sections: [
      {
        heading: "1. Acceptance of these Terms",
        paragraphs: [
          "By creating an account, signing in with a third-party provider (such as Google or Microsoft), or otherwise using Markets, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.",
          "If you use Markets on behalf of an organisation, you represent that you have authority to bind that organisation, and “you” refers to both you and the organisation.",
        ],
      },
      {
        heading: "2. Eligibility and your account",
        paragraphs: [
          "You must be at least 16 years old, or the age of digital consent in your jurisdiction, to use Markets. If you are below the age of majority where you live, you may only use the service with the involvement of a parent or guardian.",
          "You are responsible for the accuracy of the information associated with your account and for keeping your credentials confidential. Notify us immediately if you suspect unauthorised access. We may suspend accounts that we reasonably believe are compromised or used in violation of these Terms.",
        ],
      },
      {
        heading: "3. Licence and acceptable use",
        paragraphs: [
          "Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable licence to access and use Markets for your personal, non-commercial research and educational purposes.",
          "You may not: (a) scrape, crawl or bulk-download the service or its data except as expressly permitted; (b) reverse engineer, decompile or attempt to extract source code; (c) resell, redistribute or commercially exploit the service or its data; (d) interfere with the security, integrity or availability of the service; (e) use the service to build a competing product; or (f) use automated means to bypass usage limits or access controls.",
        ],
      },
      {
        heading: "4. Subscriptions, billing and cancellation",
        paragraphs: [
          "Some features require a paid Pro subscription. Prices, billing periods and included features are shown on the pricing page or at checkout. Payments are processed by our third-party payment provider, and their terms may also apply.",
          "Subscriptions renew automatically unless cancelled before the end of the current billing period. You may cancel at any time; access to Pro features continues until the end of the period already paid for. Except where required by applicable law, payments are non-refundable.",
          "We may change prices or plan features with reasonable notice. If you do not agree to a change, you may cancel before it takes effect.",
        ],
      },
      {
        heading: "5. Third-party services and market data",
        paragraphs: [
          "Markets displays market data obtained from third-party providers. Data may be delayed, incomplete, interrupted or subject to provider terms. We do not guarantee that any quote, index level, valuation, indicator or K-line series is accurate or current at any given moment.",
          "Sign-in through Google or Microsoft is provided by those providers and is subject to their own terms and privacy policies. We are not responsible for third-party services, links or content.",
        ],
      },
      {
        heading: "6. Intellectual property",
        paragraphs: [
          "The service, including its design, software, text, graphics and original analysis, is owned by us or our licensors and is protected by intellectual property laws. These Terms do not grant you any ownership interest in the service.",
          "You retain ownership of content you submit (for example, prompts or notes). You grant us a limited licence to process that content solely to operate and improve the service.",
        ],
      },
      {
        heading: "7. Availability, changes and beta features",
        paragraphs: [
          "We aim to keep Markets available, but we do not promise uninterrupted or error-free operation. We may modify, suspend or discontinue any part of the service, including features labelled beta, preview or coming soon.",
          "Backtesting, simulation and AI outputs depend on historical data and modelling assumptions. They are provided for illustration and learning, and may not reflect real trading conditions.",
        ],
      },
      {
        heading: "8. Disclaimers",
        paragraphs: [
          "Markets is an information and analytics tool. It does not provide personalised investment, legal, tax or accounting advice, and it does not execute trades. Your use of the service is at your own risk.",
          "The Financial Disclaimer forms part of these Terms. Please read it carefully before relying on any market data, backtest, XIRR figure, simulation or AI-generated content.",
        ],
      },
      {
        heading: "9. Limitation of liability",
        paragraphs: [
          "To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential or punitive damages, or for any loss of profits, data, goodwill or investment losses arising from your use of, or inability to use, the service.",
          "Where liability cannot be excluded, our aggregate liability is limited to the greater of (a) the amount you paid us in the 12 months before the claim, or (b) USD 100.",
        ],
      },
      {
        heading: "10. Termination",
        paragraphs: [
          "You may stop using the service at any time. We may suspend or terminate your access if you materially breach these Terms, if required by law, or if necessary to protect the service or other users.",
          "Sections that by their nature should survive termination — including intellectual property, disclaimers, limitation of liability and governing law — will continue to apply.",
        ],
      },
      {
        heading: "11. Governing law and disputes",
        paragraphs: [
          "These Terms are governed by the laws of the jurisdiction in which the operator of Markets is established, without regard to conflict-of-law rules. Nothing in these Terms limits mandatory consumer protections available to you under your local law.",
          "Before starting formal proceedings, please contact us so we can try to resolve the dispute informally.",
        ],
      },
      {
        heading: "12. Contact",
        paragraphs: [
          "Questions about these Terms? Contact us through the support channel listed on the website. We may update these Terms from time to time; material changes will be announced in the product or by email.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    updated: "November 16, 2026",
    summary:
      "This policy explains what personal data Markets collects, why we collect it, how we protect it, and the choices available to you.",
    sections: [
      {
        heading: "1. Overview",
        paragraphs: [
          "Markets (“we”, “us”) provides market dashboards, analytics and educational tools. This Privacy Policy applies to our website, applications and related services.",
          "We collect only the information we need to operate the service, keep accounts secure and improve the product. We do not sell your personal data.",
        ],
      },
      {
        heading: "2. Information we collect",
        paragraphs: [
          "Account information: your email address, display name and profile image supplied when you sign in with Google, Microsoft or email. If you use email sign-in, we also process authentication credentials through our authentication provider.",
          "Usage information: pages viewed, features used, approximate region, browser and device type, and diagnostic logs. We use this information to operate, secure and improve the service.",
          "Payment information: if you subscribe to Pro, our payment provider processes billing details. We receive limited information such as your plan status and transaction reference, not your full card number.",
        ],
      },
      {
        heading: "3. How we use information",
        paragraphs: [
          "We use personal data to create and manage your account, authenticate you, provide dashboards and backtests, enforce plan limits, respond to support requests, prevent abuse, and communicate service-related notices.",
          "We may also use aggregated or de-identified information for analytics and product research. Aggregated information cannot reasonably be used to identify you.",
        ],
      },
      {
        heading: "4. Legal bases (EEA and UK)",
        paragraphs: [
          "Where the GDPR or UK GDPR applies, we rely on: performance of a contract (to provide the service), legitimate interests (to secure and improve the service), consent (for optional communications or cookies where required), and legal obligation (for tax, accounting or regulatory records).",
        ],
      },
      {
        heading: "5. Cookies and local storage",
        paragraphs: [
          "We use strictly necessary cookies to remember your language preference and authentication state. We may use local storage to keep session information and UI preferences on your device.",
          "You can clear cookies and local storage through your browser settings. Some features, such as staying signed in or remembering your language, may stop working if you do.",
        ],
      },
      {
        heading: "6. Sharing and processors",
        paragraphs: [
          "We share data with service providers that help us run Markets, including Supabase (database and authentication), Google and Microsoft (optional single sign-on), payment processors, hosting providers and analytics tools. These providers process data on our instructions and under appropriate contractual safeguards.",
          "We may disclose information if required by law, to protect our rights or the safety of users, or in connection with a merger, acquisition or sale of assets, subject to appropriate confidentiality protections.",
        ],
      },
      {
        heading: "7. International transfers",
        paragraphs: [
          "Our providers may process data in countries other than your own. Where required, we use recognised safeguards such as standard contractual clauses or equivalent mechanisms to protect transferred data.",
        ],
      },
      {
        heading: "8. Retention",
        paragraphs: [
          "We retain account data for as long as your account is active and for a reasonable period afterwards to comply with legal obligations, resolve disputes and enforce agreements. Diagnostic logs are kept for a shorter period unless needed for security investigations.",
        ],
      },
      {
        heading: "9. Security",
        paragraphs: [
          "We use technical and organisational measures designed to protect personal data, including encrypted transport, access controls and least-privilege service credentials. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.",
        ],
      },
      {
        heading: "10. Your rights",
        paragraphs: [
          "Depending on your location, you may have the right to access, correct, delete, restrict or object to the processing of your personal data, and to request portability. You may also withdraw consent where processing is based on consent.",
          "To exercise these rights, contact us through the support channel. You may also lodge a complaint with your local data protection authority. We will respond within the time required by applicable law.",
        ],
      },
      {
        heading: "11. Children",
        paragraphs: [
          "Markets is not directed to children under 16, and we do not knowingly collect personal data from them. If you believe a child has provided us with personal data, please contact us so we can delete it.",
        ],
      },
      {
        heading: "12. Changes and contact",
        paragraphs: [
          "We may update this Privacy Policy to reflect changes in our practices or the law. Material changes will be announced in the product or by email. Continued use of the service after an update means you accept the revised policy.",
          "For privacy questions or requests, contact us through the support channel listed on the website.",
        ],
      },
    ],
  },
  disclaimer: {
    title: "Financial Disclaimer",
    updated: "November 16, 2026",
    summary:
      "Markets provides market information and educational analytics. Nothing on this website is investment advice or a recommendation to buy or sell any security.",
    sections: [
      {
        heading: "1. Not investment advice",
        paragraphs: [
          "All content on Markets — including quotes, charts, technical indicators, valuations, news summaries, AI commentary and portfolio tools — is provided for general information and education only. It does not constitute investment, financial, legal, tax or accounting advice, and it is not a personal recommendation or solicitation to buy, sell or hold any security, fund, derivative or other financial instrument.",
          "We are not a broker, dealer, investment adviser, portfolio manager or fiduciary. No advisory or fiduciary relationship is created by your use of the service.",
        ],
      },
      {
        heading: "2. Market data may be delayed or incomplete",
        paragraphs: [
          "Market data is sourced from third-party providers and may be delayed, incomplete, interrupted or subject to exchange and provider terms. Prices, index levels, volumes, valuations, P/E and P/B percentiles, 52-week ranges and K-line series are indicative only and should be verified with your broker or an official exchange source before you act.",
          "Data may be shown in a demo or cached state when a live feed is unavailable. The “Live”, “Demo” and “Cached” labels describe the feed status, not the suitability of the data for trading.",
        ],
      },
      {
        heading: "3. Historical backtests, simulations and XIRR",
        paragraphs: [
          "Backtests, DCA (dollar-cost averaging) studies, portfolio simulations and XIRR figures are hypothetical and for illustration only. They use historical daily closes and simplified assumptions, typically excluding dividends, withholding taxes, transaction fees, bid-ask spreads, slippage, market impact and liquidity constraints.",
          "XIRR is a money-weighted annualised return calculated from irregular cash flows. For periods shorter than one year, annualising the result can exaggerate or distort performance, and it should not be compared directly with one-year or longer returns.",
          "Past performance and hypothetical results are not reliable indicators of future results. Actual returns will differ, possibly materially. Backtest results do not represent trades that were actually executed, and no account achieved or would have achieved the results shown.",
        ],
      },
      {
        heading: "4. AI-generated content",
        paragraphs: [
          "AI summaries and assistant responses are generated automatically from market data and language models. They may contain errors, omissions or outdated information, and they may not reflect events that occurred after their generation time. Always verify AI output independently before relying on it.",
        ],
      },
      {
        heading: "5. Investment risk",
        paragraphs: [
          "Investing involves risk, including the possible loss of all or more than your original capital. Securities, derivatives, foreign-exchange products and leveraged instruments can be highly volatile. You are solely responsible for your investment decisions, position sizing and risk management.",
          "Consider your objectives, financial situation and risk tolerance, and consult a licensed professional where appropriate, before making any investment decision.",
        ],
      },
      {
        heading: "6. No guarantee of availability or accuracy",
        paragraphs: [
          "We strive to keep information accurate and services available, but we make no warranty — express or implied — regarding accuracy, completeness, timeliness, reliability, merchantability or fitness for a particular purpose. The service is provided “as is” and “as available”.",
        ],
      },
      {
        heading: "7. Third-party links and content",
        paragraphs: [
          "Markets may link to third-party websites or display third-party data. We do not control and are not responsible for their content, accuracy, security or privacy practices. Accessing third-party resources is at your own risk.",
        ],
      },
      {
        heading: "8. Limitation of liability",
        paragraphs: [
          "To the maximum extent permitted by law, we disclaim liability for any direct, indirect, incidental, consequential or special loss, including trading losses, lost profits or lost data, arising from your use of, or reliance on, the service or its content.",
        ],
      },
      {
        heading: "9. Jurisdiction-specific notices",
        paragraphs: [
          "Nothing in this disclaimer excludes or limits any duty or liability that cannot be excluded or limited under applicable law, including mandatory consumer protections. If any provision is held unenforceable, the remaining provisions continue in full force.",
        ],
      },
      {
        heading: "10. Contact",
        paragraphs: [
          "If anything in this Financial Disclaimer is unclear, please contact us through the support channel before making an investment decision. This disclaimer should be read together with our Terms of Service and Privacy Policy.",
        ],
      },
    ],
  },
};

const zh: Record<LegalDocId, LegalDoc> = {
  terms: {
    title: "服务条款",
    updated: "2026 年 11 月 16 日",
    summary:
      "本条款约束您对 Markets 的访问与使用，包括行情看板、市场数据、回测工具及 AI 功能。",
    sections: [
      {
        heading: "一、条款的接受",
        paragraphs: [
          "当您创建账号、通过第三方账号（如 Google、Microsoft）登录或以其他方式使用 Markets 时，即表示您同意受本《服务条款》约束。如您不同意，请停止使用本服务。",
          "如您代表某一组织使用 Markets，您声明已获得代表该组织接受本条款的授权，此时“您”同时指您本人与该组织。",
        ],
      },
      {
        heading: "二、使用资格与账号",
        paragraphs: [
          "您须年满 16 周岁，或达到您所在司法辖区的数字同意年龄，方可使用 Markets。如您未达到所在地的成年年龄，须在父母或监护人的陪同下使用本服务。",
          "您应确保账号信息的真实、准确，并妥善保管登录凭证。如发现未经授权的访问，请立即通知我们。对于合理怀疑已被盗用或违反本条款使用的账号，我们有权暂停其访问。",
        ],
      },
      {
        heading: "三、许可与可接受使用",
        paragraphs: [
          "在遵守本条款的前提下，我们授予您一项有限的、非排他性的、不可转让且可撤销的许可，供您出于个人、非商业的研究与学习目的访问和使用 Markets。",
          "您不得：(a) 未经明确许可抓取、爬取或批量下载本服务或其数据；(b) 反向工程、反编译或试图获取源代码；(c) 转售、再分发或商业化利用本服务或其数据；(d) 干扰本服务的安全性、完整性或可用性；(e) 使用本服务开发竞争性产品；或 (f) 通过自动化手段绕过使用限额或访问控制。",
        ],
      },
      {
        heading: "四、订阅、计费与取消",
        paragraphs: [
          "部分功能需要付费 Pro 订阅。价格、计费周期及所含权益以定价页面或结算页面为准。付款由第三方支付服务商处理，其条款亦可能同时适用。",
          "除在当前计费周期结束前取消外，订阅将自动续费。您可随时取消；已支付的当期 Pro 权益将持续至周期结束。除适用法律另有规定外，已支付费用不予退还。",
          "我们可在合理通知后调整价格或套餐权益；如您不同意相关调整，可在生效前取消订阅。",
        ],
      },
      {
        heading: "五、第三方服务与市场数据",
        paragraphs: [
          "Markets 展示来自第三方数据供应商的行情数据。数据可能存在延迟、缺失、中断或受供应商条款限制。我们不保证任何报价、指数点位、估值、技术指标或 K 线在任何时点均准确或及时。",
          "通过 Google 或 Microsoft 登录由相应服务商提供，并受其自身条款与隐私政策约束。我们不对第三方服务、链接或内容负责。",
        ],
      },
      {
        heading: "六、知识产权",
        paragraphs: [
          "本服务（包括其设计、软件、文字、图形及原创分析）归我们或我们的许可方所有，并受知识产权法律保护。本条款不向您转让本服务的任何所有权。",
          "您对自行提交的内容（例如提问或笔记）保留所有权，并授予我们一项有限许可，仅为运营和改进本服务之目的处理该等内容。",
        ],
      },
      {
        heading: "七、可用性、变更与测试功能",
        paragraphs: [
          "我们尽力保障 Markets 的可用性，但不承诺服务不中断或无错误。我们可能修改、暂停或终止服务的任何部分，包括标注为测试版、预览或“即将上线”的功能。",
          "回测、模拟及 AI 输出依赖历史数据与建模假设，仅供说明与学习之用，可能无法反映真实交易条件。",
        ],
      },
      {
        heading: "八、免责声明",
        paragraphs: [
          "Markets 是信息与分析工具，不提供个性化的投资、法律、税务或会计建议，亦不执行任何交易。您使用本服务的风险由您自行承担。",
          "《金融免责声明》构成本条款的组成部分。在依赖任何市场数据、回测、XIRR 数值、模拟结果或 AI 生成内容之前，请务必仔细阅读。",
        ],
      },
      {
        heading: "九、责任限制",
        paragraphs: [
          "在法律允许的最大范围内，对于因您使用或无法使用本服务而产生的任何间接、附带、特殊、后果性或惩罚性损害，以及利润、数据、商誉损失或投资损失，我们不承担责任。",
          "在责任无法排除的情况下，我们的累计责任以以下两者中的较高者为限：(a) 索赔发生前 12 个月内您向我们支付的金额；或 (b) 100 美元。",
        ],
      },
      {
        heading: "十、终止",
        paragraphs: [
          "您可随时停止使用本服务。如您严重违反本条款、法律要求或为保护本服务及其他用户所必需，我们可暂停或终止您的访问权限。",
          "依其性质应继续有效的条款——包括知识产权、免责声明、责任限制及适用法律——在终止后继续适用。",
        ],
      },
      {
        heading: "十一、适用法律与争议解决",
        paragraphs: [
          "本条款适用 Markets 运营方所在地的法律，不适用冲突法规则。本条款不限制您依当地法律享有的强制性消费者保护权利。",
          "在启动正式程序前，请先与我们联系，以便尝试友好协商解决争议。",
        ],
      },
      {
        heading: "十二、联系我们",
        paragraphs: [
          "如对本条款有任何疑问，请通过网站公布的支持渠道与我们联系。我们可能不时更新本条款；重大变更将在产品内或通过电子邮件通知。",
        ],
      },
    ],
  },
  privacy: {
    title: "隐私政策",
    updated: "2026 年 11 月 16 日",
    summary:
      "本政策说明 Markets 收集哪些个人数据、收集目的、保护方式，以及您可行使的选择权。",
    sections: [
      {
        heading: "一、概述",
        paragraphs: [
          "Markets（下称“我们”）提供行情看板、分析及教育工具。本隐私政策适用于我们的网站、应用及相关服务。",
          "我们仅收集运营服务、保障账号安全及改进产品所必需的信息，不会出售您的个人数据。",
        ],
      },
      {
        heading: "二、我们收集的信息",
        paragraphs: [
          "账号信息：当您通过 Google、Microsoft 或邮箱登录时提供的电子邮箱、显示名称及头像。如使用邮箱登录，我们还会通过身份验证服务商处理登录凭证。",
          "使用信息：访问的页面、使用的功能、大致地区、浏览器与设备类型及诊断日志。我们使用这些信息运营、保护并改进服务。",
          "支付信息：如您订阅 Pro，计费详情由第三方支付服务商处理。我们仅收到套餐状态、交易编号等有限信息，不会收到完整卡号。",
        ],
      },
      {
        heading: "三、信息的使用方式",
        paragraphs: [
          "我们使用个人数据创建和管理账号、验证身份、提供看板与回测、执行套餐限额、回应支持请求、防范滥用，并发送与服务相关的通知。",
          "我们也可能使用汇总或去标识化信息进行分析和产品研究；此类信息无法合理用于识别您的身份。",
        ],
      },
      {
        heading: "四、处理的法律依据（欧洲经济区与英国）",
        paragraphs: [
          "在适用《通用数据保护条例》（GDPR）或英国 GDPR 的情况下，我们依据以下基础处理数据：履行合同（提供服务）、合法利益（保障与改进服务）、同意（在需要时用于可选通讯或 Cookie）以及法律义务（税务、会计或监管记录）。",
        ],
      },
      {
        heading: "五、Cookie 与本地存储",
        paragraphs: [
          "我们使用严格必要的 Cookie 记住您的语言偏好和登录状态，并可能使用浏览器本地存储保存会话信息与界面偏好。",
          "您可通过浏览器设置清除 Cookie 和本地存储。清除后，保持登录、记住语言等功能可能无法正常使用。",
        ],
      },
      {
        heading: "六、共享与受托处理方",
        paragraphs: [
          "我们与协助运营 Markets 的服务商共享数据，包括 Supabase（数据库与身份验证）、Google 与 Microsoft（可选单点登录）、支付服务商、托管服务商及分析工具。上述服务商依我们的指示并在适当的合同保障下处理数据。",
          "在法律要求、为保护我们或用户的权利与安全、或在与合并、收购、资产出售相关且采取适当保密措施的情况下，我们可能披露相关信息。",
        ],
      },
      {
        heading: "七、跨境传输",
        paragraphs: [
          "我们的服务商可能在您所在国家/地区以外处理数据。在需要时，我们会采用标准合同条款或同等机制等公认保障措施保护传输的数据。",
        ],
      },
      {
        heading: "八、保留期限",
        paragraphs: [
          "在您的账号存续期间及之后一段合理时间内，我们会保留账号数据，以履行法律义务、解决争议和执行协议。诊断日志的保留时间较短，除非出于安全调查需要。",
        ],
      },
      {
        heading: "九、安全",
        paragraphs: [
          "我们采取加密传输、访问控制、最小权限服务凭证等技术与管理措施保护个人数据。但任何传输或存储方式都无法保证绝对安全，因此我们不能承诺完全无风险。",
        ],
      },
      {
        heading: "十、您的权利",
        paragraphs: [
          "根据您所在地区的规定，您可能有权访问、更正、删除、限制或反对处理您的个人数据，并有权要求数据可携带。对于基于同意进行的处理，您也可撤回同意。",
          "如需行使上述权利，请通过支持渠道联系我们；您也可向当地数据保护机构投诉。我们将在适用法律要求的期限内答复。",
        ],
      },
      {
        heading: "十一、儿童",
        paragraphs: [
          "Markets 不面向 16 周岁以下儿童，我们不会有意收集其个人数据。如您认为儿童向我们提供了个人数据，请联系我们予以删除。",
        ],
      },
      {
        heading: "十二、政策更新与联系方式",
        paragraphs: [
          "我们可能根据实践或法律变化更新本隐私政策；重大变更将在产品内或通过电子邮件通知。更新后继续使用本服务，即表示您接受修订后的政策。",
          "如对隐私有疑问或需提出请求，请通过网站公布的支持渠道与我们联系。",
        ],
      },
    ],
  },
  disclaimer: {
    title: "金融免责声明",
    updated: "2026 年 11 月 16 日",
    summary:
      "Markets 提供市场信息与教育性分析。本网站任何内容均不构成投资建议，也不构成买卖任何证券的要约或推荐。",
    sections: [
      {
        heading: "一、不构成投资建议",
        paragraphs: [
          "Markets 上的全部内容——包括报价、图表、技术指标、估值、新闻摘要、AI 评论及组合工具——仅供一般信息与教育参考，不构成投资、金融、法律、税务或会计建议，也不构成针对个人的推荐或买卖任何证券、基金、衍生品或其他金融工具的要约或招揽。",
          "我们并非经纪商、交易商、投资顾问、组合管理人，也不承担受托责任。您使用本服务不会建立任何顾问或受托关系。",
        ],
      },
      {
        heading: "二、行情数据可能延迟或不完整",
        paragraphs: [
          "市场数据来自第三方供应商，可能存在延迟、缺失、中断，或受交易所及供应商条款限制。价格、指数点位、成交量、估值、PE/PB 分位、52 周区间及 K 线仅供参考，在据此行动前应向您的经纪商或交易所官方渠道核实。",
          "当实时数据源不可用时，页面可能展示演示或缓存数据。“实时”“示例”“缓存”等标签仅描述数据源状态，不代表数据适合用于交易。",
        ],
      },
      {
        heading: "三、历史回测、模拟与 XIRR",
        paragraphs: [
          "回测、定投（DCA）测算、组合模拟及 XIRR 数值均为假设性结果，仅供说明。它们基于历史日线收盘价及简化假设，通常未计入股息、预扣税、交易费用、买卖价差、滑点、市场冲击及流动性限制。",
          "XIRR 是基于不规则现金流计算的资金加权年化收益率。对于不足一年的期间，年化处理可能放大或扭曲实际表现，不应直接与一年期或更长期限的收益率比较。",
          "过往表现及假设性结果并非未来表现的可靠指标，实际收益可能不同，且差异可能重大。回测结果不代表实际执行的交易，也不代表任何账户已实现或本可实现所示结果。",
        ],
      },
      {
        heading: "四、AI 生成内容",
        paragraphs: [
          "AI 摘要与助手回复由行情数据和语言模型自动生成，可能存在错误、遗漏或过时信息，也可能未反映生成之后发生的事件。在依赖 AI 输出前，请务必独立核实。",
        ],
      },
      {
        heading: "五、投资风险",
        paragraphs: [
          "投资存在风险，包括损失全部甚至超过本金的可能。证券、衍生品、外汇产品及杠杆工具可能高度波动。您须自行对投资决策、仓位规模及风险管理负责。",
          "在作出任何投资决定前，请结合自身目标、财务状况与风险承受能力，并在适当情况下咨询持牌专业人士。",
        ],
      },
      {
        heading: "六、不保证可用性与准确性",
        paragraphs: [
          "我们努力保持信息准确及服务可用，但不对准确性、完整性、及时性、可靠性、适销性或特定用途适用性作出任何明示或默示保证。本服务按“现状”及“现有”基础提供。",
        ],
      },
      {
        heading: "七、第三方链接与内容",
        paragraphs: [
          "Markets 可能包含第三方网站链接或展示第三方数据。我们无法控制且不对其内容、准确性、安全性或隐私实践负责。访问第三方资源的风险由您自行承担。",
        ],
      },
      {
        heading: "八、责任限制",
        paragraphs: [
          "在法律允许的最大范围内，对于因您使用或依赖本服务及其内容而产生的任何直接、间接、附带、后果性或特殊损失（包括交易损失、利润损失或数据丢失），我们均不承担责任。",
        ],
      },
      {
        heading: "九、特定司法辖区说明",
        paragraphs: [
          "本免责声明不排除或限制依适用法律不得排除或限制的任何义务或责任，包括强制性消费者保护。如任何条款被认定不可执行，其余条款仍完全有效。",
        ],
      },
      {
        heading: "十、联系我们",
        paragraphs: [
          "如本《金融免责声明》有任何不清楚之处，请在作出投资决定前通过支持渠道联系我们。本声明应与《服务条款》及《隐私政策》一并阅读。",
        ],
      },
    ],
  },
};

export const legalDocs: Record<Lang, Record<LegalDocId, LegalDoc>> = { zh, en };

export const LEGAL_ORDER: LegalDocId[] = ["terms", "privacy", "disclaimer"];