import Foundation

#if canImport(FoundationModels)
import FoundationModels
#endif

/// Talks to a small free AI model on your iPhone when Apple Intelligence is available.
/// Falls back to a free cloud API if you enable `useCloudFallback`.
final class AIService {
    // MARK: - Plan B only: set to true + add API key for older iPhones
    private let useCloudFallback = false
    private let groqAPIKey = "" // https://console.groq.com — free tier

    private let systemPrompt = """
    You are Pablete, a helpful personal AI assistant. Be concise, friendly, and practical. \
    You help with planning, writing, brainstorming, and everyday questions.
    """

    func respond(to prompt: String) async throws -> String {
        if useCloudFallback {
            return try await askGroq(prompt: prompt)
        }

        return try await askOnDevice(prompt: prompt)
    }

    // MARK: - On-device (free, private, small model)

    private func askOnDevice(prompt: String) async throws -> String {
        #if canImport(FoundationModels)
        let session = LanguageModelSession(instructions: systemPrompt)
        let response = try await session.respond(to: prompt)
        return response.content
        #else
        throw AIError.onDeviceUnavailable
        #endif
    }

    // MARK: - Cloud fallback (free tier, needs internet)

    private func askGroq(prompt: String) async throws -> String {
        guard !groqAPIKey.isEmpty else {
            throw AIError.missingAPIKey
        }

        let url = URL(string: "https://api.groq.com/openai/v1/chat/completions")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(groqAPIKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "model": "llama-3.1-8b-instant",
            "messages": [
                ["role": "system", "content": systemPrompt],
                ["role": "user", "content": prompt]
            ]
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw AIError.requestFailed
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let choices = json?["choices"] as? [[String: Any]]
        let message = choices?.first?["message"] as? [String: Any]
        let content = message?["content"] as? String

        guard let content, !content.isEmpty else {
            throw AIError.emptyResponse
        }

        return content
    }
}

enum AIError: LocalizedError {
    case onDeviceUnavailable
    case missingAPIKey
    case requestFailed
    case emptyResponse

    var errorDescription: String? {
        switch self {
        case .onDeviceUnavailable:
            return """
            On-device AI is not available on this device. \
            Turn on Apple Intelligence in Settings, use a supported iPhone, \
            or enable cloud fallback in AIService.swift.
            """
        case .missingAPIKey:
            return "Add a free Groq API key in AIService.swift (Plan B)."
        case .requestFailed:
            return "The AI request failed. Check your internet connection."
        case .emptyResponse:
            return "The AI returned an empty response."
        }
    }
}
