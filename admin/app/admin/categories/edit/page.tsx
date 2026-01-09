"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function EditCategoryRedirectPage(): null {
  const router = useRouter()

  useEffect(() => {
    router.replace("/admin/categories")
  }, [router])

  return null
}
