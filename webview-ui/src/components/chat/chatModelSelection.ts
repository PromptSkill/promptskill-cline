import type { ApiConfiguration, ApiProvider, ModelInfo } from "@shared/api"
import type { Mode } from "@shared/storage/types"
import { useEffect, useMemo, useState } from "react"
import { isPromptSkillWorkspaceFlag } from "@/integrations/promptskill/policy"

type VsCodeLmModelSelector = ApiConfiguration["planModeVsCodeLmModelSelector"]

export type ChatModeSpecificFields = {
	apiProvider?: ApiProvider
	apiModelId?: string
	togetherModelId?: string
	fireworksModelId?: string
	lmStudioModelId?: string
	ollamaModelId?: string
	liteLlmModelId?: string
	requestyModelId?: string
	openAiModelId?: string
	openRouterModelId?: string
	clineModelId?: string
	groqModelId?: string
	basetenModelId?: string
	huggingFaceModelId?: string
	huaweiCloudMaasModelId?: string
	ocaModelId?: string
	hicapModelId?: string
	aihubmixModelId?: string
	nousResearchModelId?: string
	vercelAiGatewayModelId?: string
	openAiModelInfo?: ModelInfo
	liteLlmModelInfo?: ModelInfo
	openRouterModelInfo?: ModelInfo
	clineModelInfo?: ModelInfo
	requestyModelInfo?: ModelInfo
	groqModelInfo?: ModelInfo
	basetenModelInfo?: ModelInfo
	huggingFaceModelInfo?: ModelInfo
	huaweiCloudMaasModelInfo?: ModelInfo
	ocaModelInfo?: ModelInfo
	hicapModelInfo?: ModelInfo
	aihubmixModelInfo?: ModelInfo
	vercelAiGatewayModelInfo?: ModelInfo
	vsCodeLmModelSelector?: VsCodeLmModelSelector
}

export type ChatModelSelection = {
	selectedProvider: ApiProvider
	selectedModelId: string
	selectedModelInfo: ModelInfo
	modeFields: ChatModeSpecificFields
}

const FALLBACK_MODEL_INFO: ModelInfo = {
	supportsPromptCache: false,
}

function modeValue<T>(mode: Mode, planValue: T | undefined, actValue: T | undefined): T | undefined {
	return mode === "plan" ? planValue : actValue
}

function getLeanChatModeSpecificFields(apiConfiguration: ApiConfiguration | undefined, mode: Mode): ChatModeSpecificFields {
	if (!apiConfiguration) {
		return {}
	}

	const openRouterModelId = modeValue(
		mode,
		apiConfiguration.planModeOpenRouterModelId,
		apiConfiguration.actModeOpenRouterModelId,
	)
	const openRouterModelInfo = modeValue(
		mode,
		apiConfiguration.planModeOpenRouterModelInfo,
		apiConfiguration.actModeOpenRouterModelInfo,
	)
	const clineModelId =
		modeValue(mode, apiConfiguration.planModeClineModelId, apiConfiguration.actModeClineModelId) || openRouterModelId
	const clineModelInfo =
		modeValue(mode, apiConfiguration.planModeClineModelInfo, apiConfiguration.actModeClineModelInfo) || openRouterModelInfo

	return {
		apiProvider: modeValue(mode, apiConfiguration.planModeApiProvider, apiConfiguration.actModeApiProvider),
		apiModelId: modeValue(mode, apiConfiguration.planModeApiModelId, apiConfiguration.actModeApiModelId),
		togetherModelId: modeValue(mode, apiConfiguration.planModeTogetherModelId, apiConfiguration.actModeTogetherModelId),
		fireworksModelId: modeValue(mode, apiConfiguration.planModeFireworksModelId, apiConfiguration.actModeFireworksModelId),
		lmStudioModelId: modeValue(mode, apiConfiguration.planModeLmStudioModelId, apiConfiguration.actModeLmStudioModelId),
		ollamaModelId: modeValue(mode, apiConfiguration.planModeOllamaModelId, apiConfiguration.actModeOllamaModelId),
		liteLlmModelId: modeValue(mode, apiConfiguration.planModeLiteLlmModelId, apiConfiguration.actModeLiteLlmModelId),
		requestyModelId: modeValue(mode, apiConfiguration.planModeRequestyModelId, apiConfiguration.actModeRequestyModelId),
		openAiModelId: modeValue(mode, apiConfiguration.planModeOpenAiModelId, apiConfiguration.actModeOpenAiModelId),
		openRouterModelId,
		clineModelId,
		groqModelId: modeValue(mode, apiConfiguration.planModeGroqModelId, apiConfiguration.actModeGroqModelId),
		basetenModelId: modeValue(mode, apiConfiguration.planModeBasetenModelId, apiConfiguration.actModeBasetenModelId),
		huggingFaceModelId: modeValue(
			mode,
			apiConfiguration.planModeHuggingFaceModelId,
			apiConfiguration.actModeHuggingFaceModelId,
		),
		huaweiCloudMaasModelId: modeValue(
			mode,
			apiConfiguration.planModeHuaweiCloudMaasModelId,
			apiConfiguration.actModeHuaweiCloudMaasModelId,
		),
		ocaModelId: modeValue(mode, apiConfiguration.planModeOcaModelId, apiConfiguration.actModeOcaModelId),
		hicapModelId: modeValue(mode, apiConfiguration.planModeHicapModelId, apiConfiguration.actModeHicapModelId),
		aihubmixModelId: modeValue(mode, apiConfiguration.planModeAihubmixModelId, apiConfiguration.actModeAihubmixModelId),
		nousResearchModelId: modeValue(
			mode,
			apiConfiguration.planModeNousResearchModelId,
			apiConfiguration.actModeNousResearchModelId,
		),
		vercelAiGatewayModelId: modeValue(
			mode,
			apiConfiguration.planModeVercelAiGatewayModelId,
			apiConfiguration.actModeVercelAiGatewayModelId,
		),
		openAiModelInfo: modeValue(mode, apiConfiguration.planModeOpenAiModelInfo, apiConfiguration.actModeOpenAiModelInfo),
		liteLlmModelInfo: modeValue(mode, apiConfiguration.planModeLiteLlmModelInfo, apiConfiguration.actModeLiteLlmModelInfo),
		openRouterModelInfo,
		clineModelInfo,
		requestyModelInfo: modeValue(mode, apiConfiguration.planModeRequestyModelInfo, apiConfiguration.actModeRequestyModelInfo),
		groqModelInfo: modeValue(mode, apiConfiguration.planModeGroqModelInfo, apiConfiguration.actModeGroqModelInfo),
		basetenModelInfo: modeValue(mode, apiConfiguration.planModeBasetenModelInfo, apiConfiguration.actModeBasetenModelInfo),
		huggingFaceModelInfo: modeValue(
			mode,
			apiConfiguration.planModeHuggingFaceModelInfo,
			apiConfiguration.actModeHuggingFaceModelInfo,
		),
		huaweiCloudMaasModelInfo: modeValue(
			mode,
			apiConfiguration.planModeHuaweiCloudMaasModelInfo,
			apiConfiguration.actModeHuaweiCloudMaasModelInfo,
		),
		ocaModelInfo: modeValue(mode, apiConfiguration.planModeOcaModelInfo, apiConfiguration.actModeOcaModelInfo),
		hicapModelInfo: modeValue(mode, apiConfiguration.planModeHicapModelInfo, apiConfiguration.actModeHicapModelInfo),
		aihubmixModelInfo: modeValue(mode, apiConfiguration.planModeAihubmixModelInfo, apiConfiguration.actModeAihubmixModelInfo),
		vercelAiGatewayModelInfo: modeValue(
			mode,
			apiConfiguration.planModeVercelAiGatewayModelInfo,
			apiConfiguration.actModeVercelAiGatewayModelInfo,
		),
		vsCodeLmModelSelector: modeValue(
			mode,
			apiConfiguration.planModeVsCodeLmModelSelector,
			apiConfiguration.actModeVsCodeLmModelSelector,
		),
	}
}

function selectedIdFromModeFields(provider: ApiProvider, modeFields: ChatModeSpecificFields): string {
	switch (provider) {
		case "cline":
			return modeFields.clineModelId || modeFields.openRouterModelId || modeFields.apiModelId || ""
		case "openai":
			return modeFields.openAiModelId || ""
		case "openrouter":
			return modeFields.openRouterModelId || modeFields.apiModelId || ""
		case "requesty":
			return modeFields.requestyModelId || modeFields.apiModelId || ""
		case "vscode-lm":
			return modeFields.vsCodeLmModelSelector
				? `${modeFields.vsCodeLmModelSelector.vendor}/${modeFields.vsCodeLmModelSelector.family}`
				: ""
		case "together":
			return modeFields.togetherModelId || modeFields.apiModelId || ""
		case "lmstudio":
			return modeFields.lmStudioModelId || ""
		case "ollama":
			return modeFields.ollamaModelId || ""
		case "litellm":
			return modeFields.liteLlmModelId || ""
		case "groq":
			return modeFields.groqModelId || modeFields.apiModelId || ""
		case "baseten":
			return modeFields.basetenModelId || modeFields.apiModelId || ""
		case "huggingface":
			return modeFields.huggingFaceModelId || modeFields.apiModelId || ""
		case "huawei-cloud-maas":
			return modeFields.huaweiCloudMaasModelId || modeFields.apiModelId || ""
		case "oca":
			return modeFields.ocaModelId || ""
		case "hicap":
			return modeFields.hicapModelId || ""
		case "aihubmix":
			return modeFields.aihubmixModelId || ""
		case "nousResearch":
			return modeFields.nousResearchModelId || modeFields.apiModelId || ""
		case "vercel-ai-gateway":
			return modeFields.vercelAiGatewayModelId || modeFields.apiModelId || ""
		case "fireworks":
			return modeFields.fireworksModelId || modeFields.apiModelId || ""
		default:
			return modeFields.apiModelId || ""
	}
}

function selectedInfoFromModeFields(
	provider: ApiProvider,
	apiConfiguration: ApiConfiguration | undefined,
	modeFields: ChatModeSpecificFields,
): ModelInfo {
	switch (provider) {
		case "cline":
			return modeFields.clineModelInfo || modeFields.openRouterModelInfo || FALLBACK_MODEL_INFO
		case "openai":
			return modeFields.openAiModelInfo || FALLBACK_MODEL_INFO
		case "openrouter":
			return modeFields.openRouterModelInfo || FALLBACK_MODEL_INFO
		case "requesty":
			return modeFields.requestyModelInfo || FALLBACK_MODEL_INFO
		case "vscode-lm":
			return { ...FALLBACK_MODEL_INFO, supportsImages: false }
		case "ollama":
			return { ...FALLBACK_MODEL_INFO, contextWindow: Number(apiConfiguration?.ollamaApiOptionsCtxNum ?? 32768) }
		case "lmstudio":
			return { ...FALLBACK_MODEL_INFO, contextWindow: Number(apiConfiguration?.lmStudioMaxTokens ?? 32768) }
		case "litellm":
			return modeFields.liteLlmModelInfo || FALLBACK_MODEL_INFO
		case "groq":
			return modeFields.groqModelInfo || FALLBACK_MODEL_INFO
		case "baseten":
			return modeFields.basetenModelInfo || FALLBACK_MODEL_INFO
		case "huggingface":
			return modeFields.huggingFaceModelInfo || FALLBACK_MODEL_INFO
		case "huawei-cloud-maas":
			return modeFields.huaweiCloudMaasModelInfo || FALLBACK_MODEL_INFO
		case "oca":
			return modeFields.ocaModelInfo || FALLBACK_MODEL_INFO
		case "hicap":
			return modeFields.hicapModelInfo || FALLBACK_MODEL_INFO
		case "aihubmix":
			return modeFields.aihubmixModelInfo || FALLBACK_MODEL_INFO
		case "vercel-ai-gateway":
			return modeFields.vercelAiGatewayModelInfo || FALLBACK_MODEL_INFO
		case "dify":
			return {
				maxTokens: 8192,
				contextWindow: 128000,
				supportsImages: true,
				supportsPromptCache: false,
				inputPrice: 0,
				outputPrice: 0,
				description: "Dify workflow - model selection is configured in your Dify application",
			}
		default:
			return FALLBACK_MODEL_INFO
	}
}

function getLeanChatModelSelection(apiConfiguration: ApiConfiguration | undefined, mode: Mode): ChatModelSelection {
	const modeFields = getLeanChatModeSpecificFields(apiConfiguration, mode)
	const selectedProvider = modeFields.apiProvider || "anthropic"
	const selectedModelId = selectedIdFromModeFields(selectedProvider, modeFields)

	return {
		selectedProvider,
		selectedModelId,
		selectedModelInfo: selectedInfoFromModeFields(selectedProvider, apiConfiguration, modeFields),
		modeFields,
	}
}

export function useChatModelSelection(
	apiConfiguration: ApiConfiguration | undefined,
	mode: Mode,
	isPromptSkillWorkspace: boolean | undefined,
): ChatModelSelection {
	const leanSelection = useMemo(() => getLeanChatModelSelection(apiConfiguration, mode), [apiConfiguration, mode])
	const [fullSelection, setFullSelection] = useState<ChatModelSelection | null>(null)

	useEffect(() => {
		if (isPromptSkillWorkspaceFlag(isPromptSkillWorkspace)) {
			setFullSelection(null)
			return
		}

		let isCancelled = false

		import("@/components/settings/utils/providerUtils")
			.then(({ getModeSpecificFields, normalizeApiConfiguration }) => {
				if (isCancelled) {
					return
				}

				setFullSelection({
					...normalizeApiConfiguration(apiConfiguration, mode),
					modeFields: getModeSpecificFields(apiConfiguration, mode),
				})
			})
			.catch((error) => {
				if (!isCancelled) {
					console.error("Failed to load full provider normalization", error)
					setFullSelection(null)
				}
			})

		return () => {
			isCancelled = true
		}
	}, [apiConfiguration, isPromptSkillWorkspace, mode])

	return fullSelection ?? leanSelection
}
