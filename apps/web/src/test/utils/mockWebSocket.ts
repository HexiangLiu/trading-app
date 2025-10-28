/**
 * Mock WebSocket implementation for testing
 * Supports manual event simulation and message tracking
 */

export class MockWebSocket {
  url: string
  readyState: number = WebSocket.CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((err: Event) => void) | null = null

  sentMessages: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  static instances: MockWebSocket[] = []

  send(data: string) {
    this.sentMessages.push(data)
  }

  close() {
    this.readyState = WebSocket.CLOSED
    this.onclose?.({ code: 1000, reason: 'Normal closure' } as CloseEvent)
  }

  // Test helpers: manually trigger events
  simulateOpen() {
    this.readyState = WebSocket.OPEN
    this.onopen?.()
  }

  simulateMessage(data: any) {
    const event = { data: JSON.stringify(data) } as MessageEvent
    this.onmessage?.(event)
  }

  simulateClose(code: number = 1000, reason: string = 'Normal closure') {
    this.readyState = WebSocket.CLOSED
    this.onclose?.({ code, reason } as CloseEvent)
  }

  simulateError(err: any) {
    this.onerror?.(err)
  }

  // Helper to get the latest instance
  static getLatest(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1]
  }

  // Helper to clear all instances
  static clearInstances() {
    MockWebSocket.instances = []
  }
}
