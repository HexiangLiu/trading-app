import { expect, test } from '@playwright/test'

/**
 * End-to-end test proving that an order appears in the Positions widget
 *
 * This test verifies the complete order flow:
 * 1. User submits a BUY order through the Trade Ticket
 * 2. Order gets filled (simulated by market price matching)
 * 3. Filled order creates a position that appears in the Positions tab
 */
test.describe('Order Flow to Positions Widget', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')

    // Wait for the page to load and all components to be ready
    await page.waitForLoadState('networkidle')

    // Wait for the TradingView chart to be loaded (if visible)
    await page.waitForTimeout(2000)
  })

  test('should display filled order in Positions tab', async ({ page }) => {
    // Step 1: Submit a BUY order through the Trade Ticket
    const priceInput = page.locator('input[id="price"]')
    await expect(priceInput).toBeVisible()

    // Wait for the price to be populated with best bid/ask
    await page.waitForTimeout(1000)

    // Get the current price value (should be auto-filled with best bid)
    const currentPriceStr = await priceInput.inputValue()

    // Verify that the price input has been auto-filled with best bid
    expect(currentPriceStr).toBeTruthy()
    expect(currentPriceStr.length).toBeGreaterThan(0)

    // Set price slightly higher than best bid to ensure quick fill
    // For BUY orders: order.price >= tradePrice will trigger fill
    const currentPrice = parseFloat(currentPriceStr)
    const orderPrice = (currentPrice + 1).toFixed(2)
    await priceInput.fill(orderPrice)

    // Fill in the quantity
    const quantityInput = page.locator('input[id="quantity"]')
    await expect(quantityInput).toBeVisible()
    await quantityInput.fill('0.01')

    // Verify BUY button is selected (default)
    const buyButton = page.locator('[data-testid="side-buy"]')
    await expect(buyButton).toHaveClass(/bg-green-600/)

    // Submit the order
    const submitButton = page.locator('[data-testid="submit-order"]')
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    // Wait for the success toast notification
    // orderService has 50-250ms delay, so 1000ms should be enough
    await expect(page.locator('text=Order accepted successfully')).toBeVisible({
      timeout: 1000
    })

    // Step 2: Verify order appears in Open Orders tab first
    const openOrdersTab = page.locator('[data-testid="tab-open-orders"]')
    await openOrdersTab.click()

    // Verify order is in Open Orders
    await expect(page.locator('[data-testid="open-orders-list"]')).toBeVisible()
    const orderItem = page.locator('[data-testid="order-item"]').first()
    await expect(orderItem).toBeVisible()
    await expect(orderItem.locator('[data-testid="order-side"]')).toHaveText(
      'BUY'
    )
    await expect(orderItem.locator('[data-testid="order-status"]')).toHaveText(
      'PENDING'
    )

    // Step 3: Wait for price data to arrive and fill the order
    // The order will be filled when market price <= order price (for BUY orders)
    // Since we set price slightly higher than best bid, it should fill quickly
    await page.waitForTimeout(3000)

    // Step 4: Switch to Positions tab
    const positionsTab = page.locator('[data-testid="tab-positions"]')
    await positionsTab.click()

    // Step 5: Verify the filled order creates a position in Positions tab
    await expect(
      page.locator('[data-testid="positions-tab-content"]')
    ).toBeVisible()

    // Check that positions list exists
    const positionsList = page.locator('[data-testid="positions-list"]')
    await expect(positionsList).toBeVisible()

    // Verify position item exists and has the correct details
    const positionItem = page.locator('[data-testid="position-item"]').first()
    await expect(positionItem).toBeVisible({ timeout: 5000 })

    // Verify position details: should show quantity
    await expect(positionItem.locator('text=0.0100')).toBeVisible()
  })
})
