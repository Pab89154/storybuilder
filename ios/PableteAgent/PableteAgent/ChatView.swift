import SwiftUI

struct ChatMessage: Identifiable, Equatable {
    let id = UUID()
    let role: Role
    let text: String

    enum Role {
        case user
        case assistant
    }
}

struct ChatView: View {
    @EnvironmentObject var appState: AppState

    @State private var messages: [ChatMessage] = [
        ChatMessage(role: .assistant, text: "Hi — I'm Pablete, your private on-device agent. How can I help?")
    ]
    @State private var input = ""
    @State private var isThinking = false
    @State private var errorMessage: String?

    private let ai = AIService()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                            }

                            if isThinking {
                                HStack {
                                    ProgressView()
                                        .padding(12)
                                        .background(Color(.systemGray6))
                                        .clipShape(RoundedRectangle(cornerRadius: 16))
                                    Spacer()
                                }
                            }
                        }
                        .padding()
                    }
                    .onChange(of: messages.count) { _, _ in
                        if let last = messages.last {
                            withAnimation {
                                proxy.scrollTo(last.id, anchor: .bottom)
                            }
                        }
                    }
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                }

                HStack(spacing: 8) {
                    TextField("Ask Pablete…", text: $input, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(1...4)

                    Button {
                        send()
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.title2)
                    }
                    .disabled(input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isThinking)
                }
                .padding()
                .background(.bar)
            }
            .navigationTitle("Pablete")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Lock") {
                        appState.lock()
                    }
                }
            }
        }
    }

    private func send() {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        errorMessage = nil
        input = ""
        messages.append(ChatMessage(role: .user, text: text))
        isThinking = true

        Task {
            do {
                let reply = try await ai.respond(to: text)
                messages.append(ChatMessage(role: .assistant, text: reply))
            } catch {
                errorMessage = error.localizedDescription
            }
            isThinking = false
        }
    }
}

private struct MessageBubble: View {
    let message: ChatMessage

    var body: some View {
        HStack {
            if message.role == .user { Spacer(minLength: 48) }

            Text(message.text)
                .padding(12)
                .background(message.role == .user ? Color.indigo.opacity(0.15) : Color(.systemGray6))
                .foregroundStyle(.primary)
                .clipShape(RoundedRectangle(cornerRadius: 16))

            if message.role == .assistant { Spacer(minLength: 48) }
        }
    }
}
