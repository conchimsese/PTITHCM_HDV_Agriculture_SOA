import { useState } from 'react';
import { Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { accountStatusLabels, userRoleLabels } from '@agri/contracts';
import { Action, Failure, Loading, Screen, ui } from '../../../shared/ui/Screen';
import { logoutUser, useMyProfile, usePublicProfile, useSession } from '../hooks/useUsers';
import { ProfileEditor } from '../components/ProfileEditor';
import { Avatar } from '../components/Avatar';
import { NotificationEntry } from '../../notifications/screens/NotificationsScreen';
export function ProfileScreen() {
  const session = useSession();
  const query = useMyProfile();
  const [busy, setBusy] = useState(false);
  if (!session?.tokens) return <Redirect href="/" />;
  return (
    <Screen title="Hồ sơ cá nhân" subtitle="Thông tin để kết nối và đồng hành cùng đối tác.">
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && (
          <>
            <View style={ui.card}>
              <Avatar
                path={query.data.profile?.avatarUrl ?? null}
                editable={query.data.role !== 'ADMIN'}
              />
              <Text style={ui.title}>{query.data.username}</Text>
              <Text style={ui.badge}>
                {userRoleLabels[query.data.role]} · {accountStatusLabels[query.data.status]}
              </Text>
              <Text style={ui.subtitle}>{query.data.email}</Text>
              <Text style={ui.subtitle}>
                Tham gia {new Date(query.data.createdAt).toLocaleDateString('vi-VN')}
              </Text>
            </View>
            <ProfileEditor key={query.data.accountId} account={query.data} />
          </>
        )
      )}
      <NotificationEntry />
      {session.role === 'ADMIN' && (
        <Action
          title="Quản lý tài khoản"
          secondary
          onPress={() => router.push('/quan-ly-tai-khoan')}
        />
      )}
      <Action
        title={busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
        secondary
        disabled={busy}
        onPress={() => {
          setBusy(true);
          void logoutUser()
            .catch(() => undefined)
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}
export function PublicProfileScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const session = useSession();
  const query = usePublicProfile(accountId ?? '');
  if (!session?.tokens) return <Redirect href="/" />;
  return (
    <Screen title="Hồ sơ đối tác">
      <Action title="Về hồ sơ của tôi" secondary onPress={() => router.replace('/tai-khoan')} />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && (
          <View style={ui.card}>
            <Avatar path={query.data.avatarUrl} />
            <Text style={ui.title}>{query.data.displayName}</Text>
            <Text style={ui.subtitle}>
              {[query.data.district, query.data.province].filter(Boolean).join(', ') ||
                'Chưa cập nhật khu vực'}
            </Text>
            <Text style={ui.subtitle}>
              Tham gia {new Date(query.data.joinedAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        )
      )}
    </Screen>
  );
}
