import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { userMediaPath } from '@agri/contracts';
import { env } from '../../../shared/config/env';
import { Action, ui } from '../../../shared/ui/Screen';
import { usersApi, useSession } from '../hooks/useUsers';
export function Avatar({ path, editable = false }: { path: string | null; editable?: boolean }) {
  const session = useSession();
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: FormData) => usersApi.uploadAvatar(data),
    onSuccess: () => client.invalidateQueries({ queryKey: ['users', session?.accountId] }),
  });
  const mediaPath = userMediaPath(path);
  async function pick() {
    setError('');
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) throw new Error('Ảnh đại diện tối đa 5 MiB.');
      const mime = asset.mimeType ?? 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime))
        throw new Error('Chọn ảnh JPEG, PNG hoặc WebP.');
      const form = new FormData();
      form.append('file', { uri: asset.uri, type: mime, name: asset.fileName ?? 'avatar.jpg' });
      await mutation.mutateAsync(form);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được ảnh.');
    } finally {
      setPicking(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      {mediaPath && session?.tokens && (
        <Image
          accessibilityLabel="Ảnh đại diện"
          source={{
            uri: `${env.gatewayUrl.replace(/\/$/, '')}${mediaPath}`,
            headers: { Authorization: `Bearer ${session.tokens.accessToken}` },
          }}
          style={{ width: 88, height: 88, borderRadius: 44 }}
          onError={() => setError('Không tải được ảnh đại diện.')}
        />
      )}
      {editable && (
        <>
          <Action
            title={picking ? 'Đang tải ảnh…' : 'Đổi ảnh đại diện'}
            secondary
            disabled={picking}
            onPress={() => void pick()}
          />
          <Text style={ui.subtitle}>JPEG, PNG, WebP · tối đa 5 MiB</Text>
        </>
      )}
      {error && (
        <Text style={ui.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}
