"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireUser } from "../auth"
import { db, schema } from "../db"

export async function tandaiSemuaDibaca() {
  const user = await requireUser()
  await db.update(schema.user).set({ notifDibacaAt: new Date() }).where(eq(schema.user.id, user.id))
  revalidatePath("/", "layout")
}
