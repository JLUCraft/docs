import { defineConfig } from "vitepress"
import { withMermaid } from "vitepress-plugin-mermaid"

export default withMermaid(defineConfig({
  srcDir: "pages",
  lang: "zh-CN",
  title: "JLUCraft",
  description: "吉林大学 Minecraft 同好会",
  head: [
    ["link", { rel: "icon", href: "/favicon.png" }],
    ["meta", { name: "theme-color", content: "#5c7cfa" }],
  ],
  themeConfig: {
    logo: "/favicon.png",
    nav: [
      { text: "八校互通", link: "/design/overview" },
      { text: "部署文档", link: "/components/launcher/" },
    ],
    sidebar: {
      "/design/": [
        {
          text: "整体设计",
          items: [
            { text: "总体架构", link: "/design/overview" },
            { text: "部署拓扑", link: "/design/deployment" },
            { text: "安全边界", link: "/design/security" },
            { text: "接口设计", link: "/design/api" },
          ],
        },
        {
          text: "分层设计",
          items: [
            { text: "网络代理层", link: "/design/network" },
            { text: "主机抽象层", link: "/design/hal" },
            { text: "游戏业务层", link: "/design/business" },
            { text: "多方共识层", link: "/design/consensus" },
            { text: "链上治理层", link: "/design/governance" },
            { text: "预言机", link: "/design/oracle" },
          ],
        },
        {
          text: "上层应用",
          items: [
            { text: "客户端架构", link: "/design/client" },
            { text: "联赛系统", link: "/design/tournament" },
          ],
        },
      ],
      "/components/": [
        {
          text: "FollyLauncher",
          collapsed: false,
          items: [
            { text: "概览", link: "/components/launcher/" },
            { text: "身份系统", link: "/components/launcher/identity" },
            { text: "网络引擎与实例代理", link: "/components/launcher/network" },
            { text: "主界面", link: "/components/launcher/ui" },
          ],
        },
        {
          text: "去中心化联邦服务器",
          collapsed: false,
          items: [
            { text: "概览", link: "/components/server/" },
            { text: "节点初始化", link: "/components/server/bootstrap" },
            { text: "实例生命周期与数据采集", link: "/components/server/lifecycle" },
            { text: "网络代理层与共识", link: "/components/server/network" },
          ],
        },
        {
          text: "管理终端",
          collapsed: false,
          items: [
            { text: "概览", link: "/components/manager/" },
            { text: "身份与安全", link: "/components/manager/identity" },
            { text: "实例管理", link: "/components/manager/instances" },
            { text: "治理中心与审计", link: "/components/manager/governance" },
          ],
        },
        {
          text: "无服务器皮肤站",
          collapsed: false,
          items: [
            { text: "概览", link: "/components/skin-station/" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/JLUCraft" },
    ],
    footer: {
      message: "吉林大学 Minecraft 同好会",
      copyright: "Copyright © 2026 JLUCraft",
    },
    editLink: {
      pattern: "https://github.com/JLUCraft/docs/edit/main/pages/:path",
      text: "在 GitHub 上编辑此页",
    },
    docFooter: {
      prev: "上一页",
      next: "下一页",
    },
    outline: {
      label: "页面导航",
    },
    lastUpdated: {
      text: "最后更新于",
      formatOptions: {
        dateStyle: "short",
        timeStyle: "medium",
      },
    },
    search: {
      provider: "local",
      options: {
        translations: {
          button: {
            buttonText: "搜索文档",
            buttonAriaLabel: "搜索文档",
          },
          modal: {
            noResultsText: "无法找到相关结果",
            resetButtonTitle: "清除查询条件",
            footer: {
              selectText: "选择",
              navigateText: "切换",
              closeText: "关闭",
            },
          },
        },
      },
    },
  },
  vite: {
    publicDir: "../public",
  }
}))
