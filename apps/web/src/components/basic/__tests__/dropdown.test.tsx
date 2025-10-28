import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '../dropdown'

describe('DropdownMenu', () => {
  describe('Rendering', () => {
    it('should render the trigger', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText('Open Menu')).toBeInTheDocument()
    })

    it('should render with data-slot attributes', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const trigger = screen.getByText('Trigger')
      expect(trigger).toHaveAttribute('data-slot', 'dropdown-menu-trigger')
    })
  })

  describe('User Interaction', () => {
    it('should open menu when trigger is clicked', async () => {
      const user = userEvent.setup()

      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const trigger = screen.getByText('Open Menu')
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument()
        expect(screen.getByText('Item 2')).toBeInTheDocument()
      })
    })

    it('should close menu when item is clicked', async () => {
      const user = userEvent.setup()

      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const trigger = screen.getByText('Open Menu')
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument()
      })

      const item = screen.getByText('Item 1')
      await user.click(item)

      await waitFor(() => {
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
      })
    })
  })

  describe('DropdownMenuItem', () => {
    it('should render with default variant', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem>Default Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const item = screen.getByText('Default Item')
      expect(item).toHaveAttribute('data-variant', 'default')
    })

    it('should render with destructive variant', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const item = screen.getByText('Delete')
      expect(item).toHaveAttribute('data-variant', 'destructive')
    })

    it('should render with inset prop', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem inset>Item with inset</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const item = screen.getByText('Item with inset')
      expect(item).toHaveAttribute('data-inset', 'true')
    })

    it('should apply custom className', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem className="custom-class">
              Custom Item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const item = screen.getByText('Custom Item')
      expect(item).toHaveClass('custom-class')
    })
  })

  describe('DropdownMenuLabel', () => {
    it('should render label', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuLabel>Settings</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should render with inset prop', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuLabel inset>Settings</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const label = screen.getByText('Settings')
      expect(label).toHaveAttribute('data-inset', 'true')
    })
  })

  describe('DropdownMenuSeparator', () => {
    it('should render separator', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const separator = screen.getByRole('separator')
      expect(separator).toHaveAttribute('data-slot', 'dropdown-menu-separator')
    })
  })

  describe('DropdownMenuShortcut', () => {
    it('should render shortcut', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Save
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText('⌘S')).toBeInTheDocument()
      expect(screen.getByText('⌘S')).toHaveAttribute(
        'data-slot',
        'dropdown-menu-shortcut'
      )
    })
  })

  describe('DropdownMenuGroup', () => {
    it('should render grouped items', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem>Group Item 1</DropdownMenuItem>
              <DropdownMenuItem>Group Item 2</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText('Group Item 1')).toBeInTheDocument()
      expect(screen.getByText('Group Item 2')).toBeInTheDocument()
    })
  })

  describe('Complex Scenario', () => {
    it('should handle complex menu structure', async () => {
      const user = userEvent.setup()

      render(
        <DropdownMenu>
          <DropdownMenuTrigger>File</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
              New File
              <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Open
              <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem inset>Recent Files</DropdownMenuItem>
              <DropdownMenuItem inset>Settings</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const trigger = screen.getByText('File')
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Actions')).toBeInTheDocument()
        expect(screen.getByText('New File')).toBeInTheDocument()
        expect(screen.getByText('⌘N')).toBeInTheDocument()
        expect(screen.getByText('Open')).toBeInTheDocument()
        expect(screen.getByText('⌘O')).toBeInTheDocument()
        expect(screen.getByText('Recent Files')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })

      const separators = screen.getAllByRole('separator')
      expect(separators).toHaveLength(2)
    })
  })

  describe('Keyboard Navigation', () => {
    it('should navigate through items with arrow keys', async () => {
      const user = userEvent.setup()

      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
            <DropdownMenuItem>Item 3</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const trigger = screen.getByText('Menu')
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument()
      })

      await user.keyboard('{ArrowDown}')
      const item1 = screen.getByText('Item 1')
      expect(item1).toHaveFocus()

      await user.keyboard('{ArrowDown}')
      const item2 = screen.getByText('Item 2')
      expect(item2).toHaveFocus()
    })
  })
})
