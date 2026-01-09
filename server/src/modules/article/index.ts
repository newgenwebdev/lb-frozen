import { Module } from "@medusajs/framework/utils"
import ArticleModuleService from "./services/article"

export const ARTICLE_MODULE = "articleModuleService"

export default Module(ARTICLE_MODULE, {
  service: ArticleModuleService,
})

export { ArticleModuleService }
