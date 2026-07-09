import { prebuiltAppConfig, type AppConfig } from '@mlc-ai/web-llm'
import {
  PRIMARY_MODEL_ID,
} from '@/types/story'
import { getModelsOrigin } from '@/lib/models/assetConfig'

const HOSTED_MLC_IDS = new Set([PRIMARY_MODEL_ID])

/**
 * When VITE_MODELS_BASE_URL is set, point our text models + wasm libs at that origin.
 * Expects an `mlc/` layout under that origin.
 */
export function buildMlcAppConfig(): AppConfig | undefined {
  const base = getModelsOrigin()
  if (!base) return undefined

  const config: AppConfig = structuredClone(prebuiltAppConfig)

  for (const record of config.model_list) {
    if (!HOSTED_MLC_IDS.has(record.model_id)) continue

    const wasmName = record.model_lib.split('/').pop()
    if (wasmName) {
      record.model_lib = `${base}/mlc/wasm/${wasmName}`
    }
    record.model = `${base}/mlc/${record.model_id}/`
  }

  return config
}
