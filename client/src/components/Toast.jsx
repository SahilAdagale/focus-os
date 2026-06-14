import { useState, useEffect, useCallback } from 'react'

function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000)
        return () => clearTimeout(timer)
    }, [onClose])

    const colors = {
        success: { bg: '#0d2b1e', border: '#1a4a35', text: '#1D9E75', icon: '✓' },
        info: { bg: '#1a1a3e', border: '#2a2a5e', text: '#7F77DD', icon: '☕' },
    }

    const c = colors[type] || colors.success

    return (
        <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            padding: '14px 20px',
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: '10px',
            color: c.text,
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 1000,
            animation: 'toastIn 0.3s ease-out',
            boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
        }}>
            <span style={{ fontSize: '16px' }}>{c.icon}</span>
            {message}
        </div>
    )
}

export default Toast
