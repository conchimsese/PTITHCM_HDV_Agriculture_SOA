import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { colors, radius } from '@agri/design-tokens';
import {
  notificationDate,
  notificationIcons,
  notificationTypeLabels,
  notificationTypeSchema,
  type NotificationFilters,
} from '@agri/contracts';
import { Action, Failure, Loading, Screen, ui } from '../../../shared/ui/Screen';
import { useSession } from '../../users/hooks/useUsers';
import {
  useMarkRead,
  useNotification,
  useNotifications,
  useUnreadCount,
} from '../hooks/useNotifications';

export function NotificationsScreen() {
  const session = useSession();
  const [filters, setFilters] = useState<NotificationFilters>({ page: 0 });
  const list = useNotifications(filters);
  const count = useUnreadCount();
  if (!session?.tokens) return <Redirect href="/" />;
  return (
    <SafeAreaView style={ui.screen}>
      <FlatList
        data={list.data?.items ?? []}
        keyExtractor={(item) => item.notificationId}
        contentContainerStyle={ui.content}
        refreshing={list.isFetching || count.isFetching}
        onRefresh={() => {
          void list.refetch();
          void count.refetch();
        }}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Text style={ui.brand}>❧ Ruộng Lúa Việt</Text>
            <Text style={ui.title}>Thông báo</Text>
            <Text style={ui.subtitle}>
              {count.data ? `${count.data.count} thông báo chưa đọc` : 'Cập nhật mới dành cho bạn.'}
            </Text>
            <Action title="Về hồ sơ" secondary onPress={() => router.replace('/tai-khoan')} />
            {count.error && <Failure error={count.error} retry={() => void count.refetch()} />}
            <View style={ui.row}>
              {(
                [
                  { label: 'Tất cả', value: undefined },
                  { label: 'Chưa đọc', value: false },
                  { label: 'Đã đọc', value: true },
                ] as const
              ).map((tab) => (
                <View key={tab.label} style={ui.flex}>
                  <Action
                    title={tab.label}
                    secondary={filters.isRead !== tab.value}
                    onPress={() => setFilters({ ...filters, isRead: tab.value, page: 0 })}
                  />
                </View>
              ))}
            </View>
            <Text style={ui.label}>Loại thông báo</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              <Action
                title="Tất cả loại"
                secondary={Boolean(filters.type)}
                onPress={() => setFilters({ ...filters, type: undefined, page: 0 })}
              />
              {notificationTypeSchema.options.map((type) => (
                <Action
                  key={type}
                  title={notificationTypeLabels[type]}
                  secondary={filters.type !== type}
                  onPress={() => setFilters({ ...filters, type, page: 0 })}
                />
              ))}
            </ScrollView>
            {list.isPending && <Loading />}
            {list.error && <Failure error={list.error} retry={() => void list.refetch()} />}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.status === 'UNREAD' ? 'Chưa đọc. ' : ''}${item.title}. ${notificationDate(item.createdAt)}`}
            onPress={() =>
              router.push({
                pathname: '/thong-bao/[notificationId]',
                params: { notificationId: item.notificationId },
              })
            }
            style={({ pressed }) => [
              styles.item,
              item.status === 'UNREAD' && styles.unread,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={styles.icon} accessibilityElementsHidden>
              {notificationIcons[item.type]}
            </Text>
            <View style={ui.flex}>
              <View style={ui.row}>
                <Text style={[styles.itemTitle, ui.flex]}>{item.title}</Text>
                {item.status === 'UNREAD' && <View style={styles.dot} />}
              </View>
              <Text numberOfLines={2} style={styles.preview}>
                {item.content}
              </Text>
              <Text style={styles.date}>{notificationDate(item.createdAt)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !list.isPending && !list.error ? (
            <View style={ui.card}>
              <Text style={ui.label}>Chưa có thông báo</Text>
              <Text style={ui.subtitle}>Các cập nhật phù hợp với bộ lọc sẽ xuất hiện tại đây.</Text>
              <Action
                title="Xem tất cả thông báo"
                secondary
                onPress={() => setFilters({ page: 0 })}
              />
            </View>
          ) : undefined
        }
        ListFooterComponent={
          <View style={{ gap: 16 }}>
            <View style={ui.row}>
              <View style={ui.flex}>
                <Action
                  title="← Trước"
                  secondary
                  disabled={filters.page === 0 || list.isFetching}
                  onPress={() => setFilters({ ...filters, page: filters.page - 1 })}
                />
              </View>
              <Text style={ui.subtitle}>
                {filters.page + 1} / {Math.max(1, list.data?.totalPages ?? 0)}
              </Text>
              <View style={ui.flex}>
                <Action
                  title="Sau →"
                  secondary
                  disabled={filters.page + 1 >= (list.data?.totalPages ?? 0) || list.isFetching}
                  onPress={() => setFilters({ ...filters, page: filters.page + 1 })}
                />
              </View>
            </View>
            <Text style={ui.subtitle}>
              Hiển thị thông báo trong 90 ngày gần nhất. Kéo xuống để làm mới.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

export function NotificationDetailScreen() {
  const { notificationId = '' } = useLocalSearchParams<{ notificationId: string }>();
  const session = useSession();
  const query = useNotification(notificationId);
  const mark = useMarkRead();
  const item = query.data;
  if (!session?.tokens) return <Redirect href="/" />;
  return (
    <Screen title="Chi tiết thông báo">
      <Action
        title="← Quay lại"
        secondary
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/thong-bao'))}
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        item && (
          <View style={ui.card}>
            <Text style={styles.detailIcon} accessibilityElementsHidden>
              {notificationIcons[item.type]}
            </Text>
            <Text style={ui.badge}>{notificationTypeLabels[item.type]}</Text>
            <Text style={ui.title}>{item.title}</Text>
            <Text style={styles.date}>{notificationDate(item.createdAt)}</Text>
            <Text style={styles.content}>{item.content}</Text>
            {item.status === 'UNREAD' ? (
              <Action
                title={mark.isPending ? 'Đang cập nhật…' : '✓ Đánh dấu đã đọc'}
                disabled={mark.isPending}
                onPress={() => mark.mutate(notificationId)}
              />
            ) : (
              <Text style={ui.success}>
                ✓ Đã đọc {item.readAt && notificationDate(item.readAt)}
              </Text>
            )}
            {mark.error && (
              <Text style={ui.error} accessibilityRole="alert">
                {mark.error.message}
              </Text>
            )}
            {mark.isSuccess && (
              <Text style={ui.success} accessibilityLiveRegion="polite">
                Đã đánh dấu thông báo đã đọc.
              </Text>
            )}
            {item.referenceType === 'ACCOUNT' && (
              <Action
                title="Xem tài khoản của tôi"
                secondary
                onPress={() => router.push('/tai-khoan')}
              />
            )}
          </View>
        )
      )}
    </Screen>
  );
}

export function NotificationEntry() {
  const count = useUnreadCount();
  return (
    <Action
      title={`Thông báo${count.data ? ` · ${count.data.count} chưa đọc` : ''}`}
      secondary
      onPress={() => router.push('/thong-bao')}
    />
  );
}
const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: { backgroundColor: colors.surfaceSoft, borderColor: colors.inputBorder },
  icon: { fontSize: 25, color: colors.brand700, width: 35, textAlign: 'center', paddingTop: 4 },
  itemTitle: { fontSize: 14, lineHeight: 22, color: colors.ink, fontWeight: '700' },
  preview: { color: colors.muted, fontSize: 13, lineHeight: 22, marginVertical: 8 },
  date: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand700 },
  detailIcon: { color: colors.brand700, fontSize: 36 },
  content: { color: colors.ink, fontSize: 16, lineHeight: 28, paddingVertical: 14 },
});
