# Eazo 素材来源与许可白名单

本文件是素材发现入口，不替代单项许可审查。每次采用素材都要保存来源、权利方、许可版本、取得日期、本地文件、允许用途和 SHA-256。页面公开、可下载或已付费均不自动代表可以用于 Eazo 商业产品。

## 真实摄影

| 来源 | 默认级别 | 使用要求 |
|---|---|---|
| [Unsplash](https://unsplash.com/license) | 候选 | 当前许可允许多数商业使用；不得原样转售或建立竞争图库。另查人物肖像、商标、建筑和作品权利。 |
| [Pexels](https://www.pexels.com/legal-pages/license/) | 候选 | 当前许可允许商业使用；逐张核对人物、品牌、敏感语境和禁止用途。 |
| [Adobe Stock](https://helpx.adobe.com/stock/help/usage-licensing.html) | 候选 | 购买与 Eazo 使用方式匹配的许可；Editorial 素材默认排除，超出标准许可时升级许可并保存凭证。 |
| [Getty Images](https://www.gettyimages.com/eula) | 条件候选 | 只采用合同明确覆盖产品用途的 Creative 素材；Editorial、嵌入预览和水印图不得用于商业 miniapp。 |
| [Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en) | 逐文件核验 | 只采用明确允许商业使用的文件，遵守署名、同方式共享等具体条款；另查人格权、商标和隐私限制。 |
| [Library of Congress Free to Use and Reuse](https://www.loc.gov/free-to-use/) | 逐文件核验 | 优先从标记为 Free to Use and Reuse 的集合选择，仍保存单项 rights advisory 和来源记录。 |

质量筛选遵循钟笑咪偏好：自然抓拍优先；内容正确是前提；先看构图秩序，再看色彩关系和光影；画面混乱或元素不和谐时淘汰。网站未说明是否为 AI 生成时标记“生成来源未知”。

## 电影海报、剧照与宣传素材

电影素材不设“自动可用”网站。正式素材必须来自制片方、发行方、权利代理或 Eazo/Owner 提供的明确授权。

| 来源 | 用途 |
|---|---|
| [Disney Studios Licensing](https://www.disneystudiolicensing.com/) | 按媒体、地域、期限和修改方式申请片段或剧照授权。 |
| [Sony Pictures Press Resources](https://www.sonypictures.com/corp/presscontact.html) | 查找官方宣传素材入口；宣传下载资格不自动覆盖产品内商业使用。 |
| [Sony Clip & Still Licensing](https://www.sonypicturesstudios.com/filmclipandstilllicensing.php) | 为海报、剧照或影片元素提交具体授权申请。 |

其他片厂采用相同流程：找到官方权利入口 → 描述 Eazo miniapp 用途 → 获取书面许可 → 保存许可和素材哈希 → 才能导入工程。只有 editorial、review、press-only 或 promotion-of-this-film 权利的素材，默认不能用于独立商业产品。

缺少合规海报时，Agent 生成独立原创替代视觉，保存提示词/生成说明、日期、工具、版本、用途和哈希，并标记“原创生成替代图”，不得称作官方海报。仍无法满足视觉要求时向钟笑咪索取素材。

## 只作参考

- 小红书、Pinterest、Instagram 等社交平台图片只能分析主题、构图、线条、色彩和氛围。
- 禁止把参考图简单裁切、调色、加字、抠图或局部拼接后放入正式工程。
- 可以依据抽象视觉特征重新创作，但不得复制可识别角色、品牌、作品表达或受保护的独特元素。
- `TANGandXUE/next-gen-ui-workflow` 当前用于方法参考；仓库没有覆盖全部代码与素材的统一许可证，不复制其代码和素材。

## 每项素材记录

```text
asset_id, project, role, local_file, source_url, author_or_rightsholder,
license_name, license_url_or_contract, allowed_use, restrictions,
acquired_at, ai_provenance, version, sha256, status, owner_decision
```

`status` 至少包含 `candidate`、`approved`、`blocked`、`retired`。新版本不得覆盖旧版本。发现版权或质量风险时改为 `blocked`，停止新项目使用；保留、替换或删除由钟笑咪决定。

