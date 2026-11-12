import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Employees from './Employees'
import type { PortalApi } from '../lib/api'
import { employee } from '../test/fixtures'
function apiMock() { return { list: vi.fn().mockResolvedValue({ employees: [employee] }), detail: vi.fn().mockResolvedValue(employee), create: vi.fn().mockResolvedValue(employee), timeOff: vi.fn(), general: vi.fn() } satisfies PortalApi }
describe('FR2–FR3 employee interactions', () => {
  it('loads people, opens details and creates a colleague', async () => {
    const api = apiMock(); render(<Employees api={api} />); await screen.findByText(employee.name)
    fireEvent.click(screen.getByTestId('employee-detail')); await screen.findByRole('region', { name: 'Employee details' })
    fireEvent.click(screen.getByTestId('employee-add'))
    fireEvent.change(screen.getByTestId('employee-name'), { target: { value: employee.name } }); fireEvent.change(screen.getByTestId('employee-department'), { target: { value: employee.department } }); fireEvent.change(screen.getByTestId('employee-start-date'), { target: { value: employee.startDate } })
    fireEvent.submit(screen.getByTestId('employee-create-form')); await screen.findByText(/Employee created:/)
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ name: employee.name }), expect.any(AbortSignal))
  })
  it('rejects partial and reversed hire filters', async () => {
    const api = apiMock(); render(<Employees api={api} />); await screen.findByText(employee.name)
    fireEvent.change(screen.getByTestId('hired-from'), { target: { value: '2026-12-01' } }); fireEvent.submit(screen.getByTestId('employee-filter-form'))
    expect(screen.getByRole('alert')).toHaveTextContent('both hire dates'); expect(api.list).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByTestId('hired-to'), { target: { value: '2026-01-01' } }); fireEvent.submit(screen.getByTestId('employee-filter-form')); expect(api.list).toHaveBeenCalledTimes(1)
  })
  it('shows empty and not-found states', async () => {
    const api = apiMock(); api.detail.mockRejectedValue(new Error('Employee not found.')); render(<Employees api={api} />); await screen.findByText(employee.name); fireEvent.click(screen.getByTestId('employee-detail')); expect(await screen.findByRole('alert')).toHaveTextContent('not found')
    api.list.mockResolvedValue({ employees: [] }); fireEvent.submit(screen.getByTestId('employee-filter-form')); await screen.findByText(/No employees found/)
  })
  it('preserves input on create failure and prevents concurrent creates', async () => {
    const api = apiMock(); let reject!: (error: Error) => void; api.create.mockImplementation(() => new Promise((_, fail) => { reject = fail }))
    render(<Employees api={api} />); await screen.findByText(employee.name); fireEvent.click(screen.getByTestId('employee-add'))
    fireEvent.change(screen.getByTestId('employee-name'), { target: { value: 'Noor' } }); fireEvent.change(screen.getByTestId('employee-department'), { target: { value: 'HR' } }); fireEvent.change(screen.getByTestId('employee-start-date'), { target: { value: '2026-01-01' } })
    fireEvent.submit(screen.getByTestId('employee-create-form')); fireEvent.submit(screen.getByTestId('employee-create-form')); fireEvent.click(screen.getByTestId('employee-detail'))
    expect(api.create).toHaveBeenCalledTimes(1); expect(api.detail).not.toHaveBeenCalled(); reject(new Error('Unavailable'))
    await waitFor(() => expect(screen.getByTestId('employee-save')).not.toBeDisabled()); expect(screen.getByTestId('employee-name')).toHaveValue('Noor')
  })
})
