import {useCallback} from 'react'
import {Trans} from '@lingui/react/macro'
import {useFocusEffect} from '@react-navigation/native'

import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {useSetMinimalShellMode} from '#/state/shell'
import {atoms as a, useTheme} from '#/alf'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'PromotionSettings'>

export function PromotionSettingsScreen({}: Props) {
  const t = useTheme()
  const setMinimalShellMode = useSetMinimalShellMode()

  useFocusEffect(
    useCallback(() => {
      setMinimalShellMode(false)
    }, [setMinimalShellMode]),
  )

  return (
    <Layout.Screen testID="promotionSettingsScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content align="left">
          <Layout.Header.TitleText>
            <Trans>Promotion settings</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <Text style={[a.p_lg, t.atoms.text_contrast_medium]}>
          <Trans>
            Promotion settings will be extended here. You can already create
            promotion tasks from New Promotion.
          </Trans>
        </Text>
      </Layout.Content>
    </Layout.Screen>
  )
}
