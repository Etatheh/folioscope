import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export type LegalPageId = "terms" | "privacy" | "refund" | "disclaimer";

// Translations of the current page content; the existing English terms stay intact.
export const LEGAL_TITLES_ZH: Record<LegalPageId, string> = {
  terms: "服务条款", privacy: "隐私政策", refund: "退款政策", disclaimer: "金融与历史回测免责声明",
};

type Section = { heading: string; paragraphs?: string[]; items?: string[] };
const sections: Record<LegalPageId, Section[]> = {
  terms: [
    { heading: "1. 接受条款", paragraphs: [`访问或使用 FolioScope（${SITE_URL}）、创建账户或订阅付费套餐，即表示您同意受本服务条款及《金融与历史回测免责声明》约束。如不同意，请停止使用本服务。`] },
    { heading: "2. 服务及套餐说明", paragraphs: ["FolioScope 提供网页金融图表、组合历史回测及自动财报摘要工具。", "我们保留更新、修改或增强各套餐功能的权利，以维护平台稳定并遵守数据提供商要求。"], items: ["免费版：可使用 14 个精选基准标的、交互式历史图表，以及基础组合和定投回测工具。", "Pro 订阅：解锁全美股搜索、美国、欧洲、日本及韩国的扩展市场覆盖、云端自选同步和自动 AI 财报摘要。"] },
    { heading: "3. 账户与安全", paragraphs: ["您可以通过受支持的第三方身份提供商 Google OAuth 和 GitHub OAuth 登录。您负责保护关联 OAuth 账户的安全，并对 FolioScope 账户下的所有活动负责。购买付费订阅时，您须年满 18 周岁，或达到所在司法辖区规定的法定成年年龄。"] },
    { heading: "4. 可接受的使用方式", paragraphs: ["您同意不实施以下行为："], items: ["使用自动脚本、机器人或爬虫提取 FolioScope 的市场数据、回测结果或 AI 摘要。", "重新分发、转售、再许可或以商业方式传播通过本平台取得的数据流或报告。", "试图绕过订阅访问控制、速率限制或数据库安全策略，或干扰基础设施运行。"] },
    { heading: "5. 计费、名义商户与订阅", paragraphs: ["所有付费订阅均由授权名义商户 Creem（creem.io）处理。Creem 负责支付处理、开票，以及适用的全球销售税或增值税计算和缴纳。"], items: ["自动续费：除非您在续费日前取消，否则 Pro 订阅将在每个月度或年度计费周期结束时自动续订。", "取消订阅：您可以随时在账户设置的管理订阅门户中取消。取消后，Pro 权限保留至当前已付费周期结束。"] },
    { heading: "6. 知识产权", paragraphs: ["与 FolioScope 相关的软件代码、界面设计、专有可视化布局及品牌均为 FolioScope 的专有财产。基础市场价格及企业披露文件仍归相应交易所和数据提供商所有。"] },
    { heading: "7. 责任限制与保证免责声明", paragraphs: ["FolioScope 按“现状”和“可用状态”提供，不作任何明示或默示保证。在适用法律允许的最大范围内，FolioScope 不对因使用或无法使用本平台而产生的任何直接、间接、附带、后果性或财务损失负责，包括交易损失、利润损失及数据丢失。"] },
    { heading: "8. 联系方式", paragraphs: [`如需支持、咨询计费或发送法律通知，请联系 ${CONTACT_EMAIL}。`] },
  ],
  privacy: [
    { heading: "1. 概述", paragraphs: [`FolioScope（“我们”）在 ${SITE_URL} 运营，尊重您的隐私并致力于保护个人数据。本政策说明我们收集哪些信息、如何使用，以及您如何管理或删除数据。`] },
    { heading: "2. 我们收集的信息", items: ["账户及身份信息：通过 Google OAuth 或 GitHub OAuth 登录时，我们接收您的姓名、邮箱及头像地址，用于创建和验证账户。", "工作空间数据：我们保存自选股、组合回测参数及界面偏好，以便在您的设备之间同步。", "订阅元数据：升级 Pro 后，我们保存由支付处理商同步的非敏感计费状态，包括套餐等级、订阅状态及计费周期结束日期。我们不收集、处理或保存银行卡号、CVV 安全码或银行账户凭据。", "基础技术日志：页面加载和 API 请求过程中处理的标准服务器请求元数据，如 IP 地址、浏览器类型及时间戳，用于安全、限流和调试。"] },
    { heading: "3. 信息的使用方式", paragraphs: ["我们严格将收集的数据用于以下用途：", "我们不会向第三方广告商或数据经纪商出售、出租或交易您的个人信息。"], items: ["验证身份并维持账户会话。", "同步自选股并提供免费版或 Pro 功能。", "应您的请求生成自动 AI 财报摘要。", "提供客户支持，传达重要服务或计费更新。"] },
    { heading: "4. 第三方基础设施与分包处理商", paragraphs: ["为安全、可靠地运行 FolioScope，我们使用以下服务提供商："], items: ["Supabase：提供用户身份验证及 PostgreSQL 数据库托管，通过行级安全策略（RLS）隔离用户数据。", "Vercel：托管网页应用，并执行无服务器后端 API 函数。", "Creem：作为名义商户处理订阅支付、管理客户计费门户并负责全球税务合规。", "FolioScope AI 服务提供商：通过 API 处理公开财报文本及证券代码查询，生成自动研究摘要。AI 摘要提示中不传送您的个人身份或邮箱。"] },
    { heading: "5. 数据保留与永久删除账户", paragraphs: ["仅在账户有效期间保留账户资料与自选数据。您可以随时访问、导出或永久删除数据："], items: ["自助删除：您可以直接在 FolioScope 账户设置中永久删除账户。触发删除后，账户资料、身份验证记录及自选股会立即从活动数据库中移除。", `邮件请求：您也可以通过 ${CONTACT_EMAIL} 申请人工删除账户或获取隐私协助。`] },
    { heading: "6. 政策变更", paragraphs: ["我们可能因平台或监管变化更新本隐私政策。更新后的生效日期会显示在本页顶部。"] },
  ],
  refund: [
    { heading: "1. 首次购买 7 天保障", paragraphs: ["我们希望您能够放心使用 FolioScope 的研究工具。首次购买 FolioScope Pro 订阅后，如果您因任何原因不满意，可以在首次交易日期起 7 个自然日内申请全额退款。"] },
    { heading: "2. 取消订阅", paragraphs: ["您可以随时取消自动续订的 Pro 订阅，无须支付取消费用。取消后将停止未来的周期性扣款，您仍可使用全部 Pro 功能至当前计费周期结束。"], items: ["登录 FolioScope，打开账户设置。", "点击管理订阅，进入 Creem 客户门户。", "选择取消订阅。"] },
    { heading: "3. 续费与例外情况", items: ["周期性续费：首次购买的 7 天退款窗口结束后，后续自动月付或年付续费在新计费周期开始后通常不予退款。", "特殊情况：如果经核实的技术故障导致您无法使用已付费的 Pro 功能，或重复交易导致错误扣款，请在扣款后 14 天内联系我们。我们将视情况全额或按比例退款。"] },
    { heading: "4. 如何申请退款", paragraphs: [`请发送邮件至 ${CONTACT_EMAIL}，附上 FolioScope 注册邮箱及 Creem 订单或收据编号。获批退款将通过 Creem 原路退回，通常需要 5 至 10 个工作日，具体取决于您的发卡机构或银行。`] },
  ],
  disclaimer: [
    { heading: "仅供信息与教育用途", paragraphs: [`FolioScope（${SITE_URL}）是由 FolioScope 运营的量化数据可视化及组合历史回测软件平台。所有市场图表、历史价格、定投模拟、组合配置指标及自动财报摘要均严格用于信息参考、教育及个人研究。`] },
    { heading: "不构成投资、财务或法律建议", paragraphs: ["FolioScope 在任何司法辖区均不是注册经纪交易商、投资顾问、理财规划师或税务顾问。平台展示的任何数据输出、筛选条件或 AI 文本均不构成买入、卖出或持有任何证券、股票、指数或金融工具的建议、招揽或要约。您须自行评估投资决策的收益与风险，并在作出任何财务承诺前咨询具备资质和执照的金融专业人士。"] },
    { heading: "假设性回测的局限", paragraphs: ["组合与定投回测基于历史市场数据，结果属于假设性模拟。模拟表现不代表实际交易，未计入市场流动性、滑点、买卖价差、经纪佣金、股息预扣税或货币兑换费用等实际执行因素。无论实际还是模拟，过往表现均不预示未来结果。"] },
    { heading: "AI 内容与市场数据准确性", paragraphs: ["自动市场评论和财报摘要通过 FolioScope AI，使用第三方大语言模型根据公开企业披露生成。模型可能误读数字表格、遗漏重要背景或生成不准确的摘要。美国、欧洲及亚太股票数据也可能延迟、调整或因第三方提供商故障而中断。FolioScope 不保证任何展示数据或 AI 输出的完整性、及时性或准确性。"] },
  ],
};

function linkedText(text: string) {
  return text.split(/(https:\/\/folioscope\.live|etatheh@hotmail\.com)/g).map((part, index) =>
    part === SITE_URL || part === CONTACT_EMAIL
      ? <a key={index} href={part === CONTACT_EMAIL ? `mailto:${part}` : part}>{part}</a>
      : part
  );
}

export default function LegalChineseContent({ id }: { id: LegalPageId }) {
  return sections[id].map(section => <section key={section.heading}>
    <h2>{section.heading}</h2>
    {section.paragraphs?.map(text => <p key={text}>{linkedText(text)}</p>)}
    {section.items && <ul>{section.items.map(text => <li key={text}>{linkedText(text)}</li>)}</ul>}
  </section>);
}
