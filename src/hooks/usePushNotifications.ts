import { useState, useCallback } from 'react'
import {
  type PushSubscriptionState,
  getPushSubscriptionState,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/notifications'

export function usePushNotifications() {
  const [state, setState] = useState<PushSubscriptionState>(getPushSubscriptionState)
  const [isLoading, setIsLoading] = useState(false)

  const subscribe = useCallback(async () => {
    setIsLoading(true)
    try {
      const success = await subscribeToPush()
      setState({
        ...getPushSubscriptionState(),
        isSubscribed: success,
      })
      return success
    } finally {
      setIsLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    try {
      await unsubscribeFromPush()
      setState({
        ...getPushSubscriptionState(),
        isSubscribed: false,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refresh = useCallback(() => {
    setState(getPushSubscriptionState())
  }, [])

  return {
    ...state,
    isLoading,
    subscribe,
    unsubscribe,
    refresh,
  }
}
