import { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import {
  accountStatusLabels,
  accountStatusSchema,
  roleSchema,
  userRoleLabels,
  emptyRegistration,
  registrationRequest,
  type AccountFilters,
  type AccountStatus,
} from '@agri/contracts';
import { Action, Failure, Field, Loading, Screen, ui } from '../../../shared/ui/Screen';
import { useAccount, useAccounts, useManageAccount, useSession } from '../hooks/useUsers';
import { ProfileEditor } from '../components/ProfileEditor';
export function AccountsScreen() {
  const session = useSession();
  const [filters, setFilters] = useState<AccountFilters>({ page: 0 });
  const query = useAccounts(filters);
  if (!session?.tokens) return <Redirect href="/" />;
  if (session.role !== 'ADMIN')
    return (
      <Screen title="Không có quyền truy cập">
        <Action title="Về hồ sơ" onPress={() => router.replace('/tai-khoan')} />
      </Screen>
    );
  return (
    <SafeAreaView style={ui.screen}>
      <FlatList
        contentContainerStyle={ui.content}
        data={query.data?.items ?? []}
        keyExtractor={(item) => item.accountId}
        refreshing={query.isFetching}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Text style={ui.brand}>❧ Ruộng Lúa Việt</Text>
            <Text style={ui.title}>Quản lý tài khoản</Text>
            <Action title="Về hồ sơ" secondary onPress={() => router.replace('/tai-khoan')} />
            <Action title="+ Tạo tài khoản" onPress={() => router.push('/tao-tai-khoan')} />
            <Text style={ui.label}>Vai trò</Text>
            <View style={ui.row}>
              <Action
                title="Tất cả"
                secondary={Boolean(filters.role)}
                onPress={() => setFilters({ ...filters, role: undefined, page: 0 })}
              />
              {roleSchema.options.map((role) => (
                <Action
                  key={role}
                  title={userRoleLabels[role]}
                  secondary={filters.role !== role}
                  onPress={() => setFilters({ ...filters, role, page: 0 })}
                />
              ))}
            </View>
            <Text style={ui.label}>Trạng thái</Text>
            <View style={ui.row}>
              <Action
                title="Tất cả"
                secondary={Boolean(filters.status)}
                onPress={() => setFilters({ ...filters, status: undefined, page: 0 })}
              />
              {accountStatusSchema.options.map((status) => (
                <Action
                  key={status}
                  title={accountStatusLabels[status]}
                  secondary={filters.status !== status}
                  onPress={() => setFilters({ ...filters, status, page: 0 })}
                />
              ))}
            </View>
            {query.isPending && <Loading />}
            {query.error && <Failure error={query.error} retry={() => void query.refetch()} />}
          </View>
        }
        renderItem={({ item }) => (
          <View style={ui.card}>
            <Text style={ui.label}>{item.username}</Text>
            <Text style={ui.subtitle}>{item.email}</Text>
            <Text style={ui.badge}>
              {userRoleLabels[item.role]} · {accountStatusLabels[item.status]}
            </Text>
            <Action
              title="Xem chi tiết"
              secondary
              onPress={() =>
                router.push({
                  pathname: '/chi-tiet-tai-khoan',
                  params: { accountId: item.accountId },
                })
              }
            />
          </View>
        )}
        ListEmptyComponent={
          !query.isPending && !query.error ? (
            <Text style={ui.subtitle}>Không có tài khoản khớp bộ lọc.</Text>
          ) : undefined
        }
        ListFooterComponent={
          <View style={{ gap: 16 }}>
            <Text style={ui.subtitle}>
              Trang {filters.page + 1} / {Math.max(1, query.data?.totalPages ?? 0)} ·{' '}
              {query.data?.totalElements ?? 0} tài khoản
            </Text>
            <View style={ui.row}>
              <View style={ui.flex}>
                <Action
                  title="← Trước"
                  secondary
                  disabled={filters.page === 0 || query.isFetching}
                  onPress={() => setFilters({ ...filters, page: filters.page - 1 })}
                />
              </View>
              <View style={ui.flex}>
                <Action
                  title="Sau →"
                  secondary
                  disabled={filters.page + 1 >= (query.data?.totalPages ?? 0) || query.isFetching}
                  onPress={() => setFilters({ ...filters, page: filters.page + 1 })}
                />
              </View>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

export function AccountDetailScreen() {
  const { accountId = '' } = useLocalSearchParams<{ accountId: string }>();
  const session = useSession();
  const query = useAccount(accountId);
  const mutation = useManageAccount();
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<Exclude<AccountStatus, 'UNVERIFIED'>>('ACTIVE');
  const [error, setError] = useState('');
  if (!session?.tokens) return <Redirect href="/" />;
  if (session.role !== 'ADMIN') return <Redirect href="/tai-khoan" />;
  return (
    <Screen title="Chi tiết tài khoản">
      <Action
        title="← Danh sách tài khoản"
        secondary
        onPress={() => router.replace('/quan-ly-tai-khoan')}
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && (
          <>
            <View style={ui.card}>
              <Text style={ui.title}>{query.data.username}</Text>
              <Text style={ui.subtitle}>{query.data.email}</Text>
              <Text style={ui.badge}>
                {userRoleLabels[query.data.role]} · {accountStatusLabels[query.data.status]}
              </Text>
            </View>
            <ProfileEditor key={query.data.accountId} account={query.data} targetId={accountId} />
            <View style={ui.card}>
              <Text style={ui.label}>Trạng thái hoạt động</Text>
              <Text style={ui.subtitle}>
                Tài khoản chưa xác minh cần hoàn tất OTP trước khi kích hoạt.
              </Text>
              <View style={ui.row}>
                {(['ACTIVE', 'LOCKED', 'INACTIVE'] as const).map((next) => (
                  <Action
                    key={next}
                    title={accountStatusLabels[next]}
                    secondary={status !== next}
                    disabled={
                      mutation.isPending || (accountId === session.accountId && next !== 'ACTIVE')
                    }
                    onPress={() => setStatus(next)}
                  />
                ))}
              </View>
              <Field
                label="Lý do thay đổi"
                value={reason}
                onChangeText={setReason}
                maxLength={500}
                editable={!mutation.isPending}
              />
              <Action
                title="Cập nhật trạng thái"
                disabled={
                  mutation.isPending || (accountId === session.accountId && status !== 'ACTIVE')
                }
                onPress={() => {
                  setError('');
                  if (!reason.trim()) {
                    setError('Vui lòng nhập lý do.');
                    return;
                  }
                  mutation.mutate({ id: accountId, status, reason });
                }}
              />
              <Action
                title="Ngừng hoạt động tài khoản"
                danger
                disabled={
                  mutation.isPending ||
                  accountId === session.accountId ||
                  query.data.status === 'INACTIVE'
                }
                onPress={() =>
                  Alert.alert(
                    'Ngừng hoạt động tài khoản?',
                    'Người dùng sẽ không thể tiếp tục sử dụng tài khoản.',
                    [
                      { text: 'Hủy', style: 'cancel' },
                      {
                        text: 'Ngừng hoạt động',
                        style: 'destructive',
                        onPress: () => mutation.mutate({ id: accountId, remove: true }),
                      },
                    ],
                  )
                }
              />
              {(error || mutation.error) && (
                <Text style={ui.error} accessibilityRole="alert">
                  {error || mutation.error?.message}
                </Text>
              )}
              {mutation.isSuccess && <Text style={ui.success}>Đã cập nhật tài khoản.</Text>}
            </View>
          </>
        )
      )}
    </Screen>
  );
}

export function CreateAccountScreen() {
  const session = useSession();
  const [form, setForm] = useState({ ...emptyRegistration });
  const [error, setError] = useState('');
  const mutation = useManageAccount();
  if (!session?.tokens) return <Redirect href="/" />;
  if (session.role !== 'ADMIN') return <Redirect href="/tai-khoan" />;
  return (
    <Screen title="Tạo tài khoản">
      <Action
        title="← Danh sách tài khoản"
        secondary
        onPress={() => router.replace('/quan-ly-tai-khoan')}
      />
      <View style={ui.card}>
        <View style={ui.row}>
          {(['FARMER', 'TRADER'] as const).map((role) => (
            <Action
              key={role}
              title={userRoleLabels[role]}
              disabled={mutation.isPending}
              secondary={form.role !== role}
              onPress={() => setForm({ ...form, role })}
            />
          ))}
        </View>
        {(['name', 'phone', 'email', 'password', 'confirmPassword'] as const).map((key) => (
          <Field
            key={key}
            label={
              {
                name: 'Họ tên / Doanh nghiệp',
                phone: 'Số điện thoại',
                email: 'Email',
                password: 'Mật khẩu',
                confirmPassword: 'Nhập lại mật khẩu',
              }[key]
            }
            value={form[key]}
            onChangeText={(value) => {
              mutation.reset();
              setForm({ ...form, [key]: value });
            }}
            editable={!mutation.isPending}
            maxLength={key === 'name' ? 150 : key === 'phone' ? 20 : key === 'email' ? 254 : 72}
            secureTextEntry={key.includes('assword')}
            autoCapitalize={key === 'name' ? 'words' : 'none'}
            keyboardType={
              key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'
            }
          />
        ))}
        <Action
          title={mutation.isPending ? 'Đang tạo…' : 'Tạo và gửi email xác minh'}
          disabled={mutation.isPending}
          onPress={() => {
            setError('');
            try {
              mutation.mutate(
                { create: registrationRequest(form) },
                { onSuccess: () => setForm({ ...emptyRegistration }) },
              );
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : 'Dữ liệu không hợp lệ.');
            }
          }}
        />
        {(error || mutation.error) && (
          <Text style={ui.error} accessibilityRole="alert">
            {error || mutation.error?.message}
          </Text>
        )}
        {mutation.isSuccess && (
          <Text style={ui.success}>
            {mutation.data &&
            'verificationEmailStatus' in mutation.data &&
            mutation.data.verificationEmailStatus === 'FAILED'
              ? 'Đã tạo tài khoản nhưng gửi email thất bại. Người dùng có thể gửi lại OTP tại màn hình đăng nhập.'
              : 'Đã tạo tài khoản. Người dùng cần xác minh email để hoạt động.'}
          </Text>
        )}
      </View>
    </Screen>
  );
}
