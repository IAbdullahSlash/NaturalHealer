import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const deleteAccount = vi.fn()
let password = true
vi.mock('../services/authService', () => ({
  deleteAccount: (...args) => deleteAccount(...args),
  usesPassword: () => password,
}))

const { default: Account } = await import('../components/Account')
const user = { uid: 'u1', displayName: 'Asha', email: 'asha@example.com' }

function openConfirm(onDeleted = vi.fn()) {
  render(<MemoryRouter><Account user={user} onLogout={() => {}} onOpenAIChat={() => {}} onDeleted={onDeleted} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Delete account' }))
  return onDeleted
}

const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const submitButton = () => screen.getByRole('button', { name: 'Delete my account permanently' })

beforeEach(() => { deleteAccount.mockReset(); password = true })

describe('Account page', () => {
  it('only allows deletion after typing DELETE and the password', async () => {
    deleteAccount.mockResolvedValue({ success: true })
    const onDeleted = openConfirm()
    expect(submitButton().disabled).toBe(true)

    type('Type DELETE to confirm', 'delete')
    type('Your password', 'pw')
    expect(submitButton().disabled).toBe(true)

    type('Type DELETE to confirm', 'DELETE')
    expect(submitButton().disabled).toBe(false)
    fireEvent.click(submitButton())
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    expect(deleteAccount).toHaveBeenCalledWith('pw')
  })

  it('keeps the account and shows why when deletion fails', async () => {
    deleteAccount.mockResolvedValue({ success: false, error: 'That password is not correct.' })
    const onDeleted = openConfirm()
    type('Type DELETE to confirm', 'DELETE')
    type('Your password', 'wrong')
    fireEvent.click(submitButton())
    expect((await screen.findByRole('alert')).textContent).toBe('That password is not correct.')
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('asks Google accounts to confirm in a popup instead of a password', () => {
    password = false
    openConfirm()
    expect(screen.queryByLabelText('Your password')).toBeNull()
    type('Type DELETE to confirm', 'DELETE')
    expect(submitButton().disabled).toBe(false)
  })
})
