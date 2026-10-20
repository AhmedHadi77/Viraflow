import { Ionicons } from "@expo/vector-icons";
import { ComponentProps, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, Pressable, Switch, Text, TextInput, View } from "react-native";
import { fill } from "../utils/labels";
import { setConvertPrices, useExchangeRates } from "../services/exchangeRates";
import { rtlFlipStyle } from "../utils/layoutDirection";
import { Screen } from "../components/Screen";
import { SelectionOption, SelectionSheet } from "../components/SelectionSheet";
import { getCopy, getLanguageInfo, supportedLanguages } from "../data/copy";
import { formatPrice, getRegion, regions } from "../data/regions";
import { useAppState } from "../providers/AppProvider";
import { isLanguageOption } from "../types/models";
import { palette, radii, spacing, createThemedStyles } from "../theme";
import { useThemeMode } from "../theme/ThemeProvider";
import { formatDate } from "../utils/timeFormatting";

type OpenSheet = "language" | "region" | null;

export function SettingsScreen({ navigation }: { navigation: any }) {
  const { language, region, localeTag, setLanguage, setRegion, currentUser, logout, deleteAccount, pushNotificationsStatus } =
    useAppState();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { mode, setMode } = useThemeMode();
  const { convertPrices } = useExchangeRates();
  const copy = getCopy(language);
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const languageInfo = getLanguageInfo(language);
  const regionInfo = getRegion(region);

  const languageOptions = useMemo<SelectionOption[]>(
    () =>
      supportedLanguages.map((item) => ({
        value: item.code,
        title: item.nativeName,
        subtitle: item.englishName,
      })),
    []
  );

  const regionOptions = useMemo<SelectionOption[]>(
    () =>
      regions.map((item) => ({
        value: item.code,
        title: item.name,
        subtitle: item.currency,
        leading: item.flag,
        keywords: `${item.code} ${item.currency}`,
      })),
    []
  );

  // Live preview so the user sees exactly what the region changes.
  const pricePreview = formatPrice(1250, regionInfo.currency, localeTag);
  const datePreview = formatDate(Date.now(), { year: "numeric", month: "long", day: "numeric" });

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>{copy.appearanceSetting}</Text>
      <View style={styles.card}>
        <View style={styles.segment}>
          {(["dark", "light"] as const).map((item) => {
            const active = mode === item;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={item}
                onPress={() => setMode(item)}
                style={[styles.segmentItem, active ? styles.segmentItemActive : null]}
              >
                <Ionicons
                  color={active ? "#FFFFFF" : palette.muted}
                  name={item === "dark" ? "moon" : "sunny"}
                  size={18}
                />
                <Text style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]}>
                  {item === "dark" ? copy.darkMode : copy.lightMode}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionLabel}>{copy.languageSetting}</Text>
      <View style={styles.card}>
        <SettingRow
          icon="language-outline"
          onPress={() => setOpenSheet("language")}
          title={languageInfo.nativeName}
          value={languageInfo.englishName}
        />
        <Text style={styles.helper}>{copy.languageSettingBody}</Text>
      </View>

      <Text style={styles.sectionLabel}>{copy.regionSetting}</Text>
      <View style={styles.card}>
        <SettingRow
          icon="globe-outline"
          leading={regionInfo.flag}
          onPress={() => setOpenSheet("region")}
          title={regionInfo.name}
          value={`${copy.currencyLabel}: ${regionInfo.currency}`}
        />
        <View style={styles.previewRow}>
          <View style={styles.previewChip}>
            <Ionicons color={palette.muted} name="pricetag-outline" size={14} />
            <Text style={styles.previewText}>{pricePreview}</Text>
          </View>
          <View style={styles.previewChip}>
            <Ionicons color={palette.muted} name="calendar-outline" size={14} />
            <Text style={styles.previewText}>{datePreview}</Text>
          </View>
        </View>
        <Text style={styles.helper}>{copy.regionSettingBody}</Text>
        <View style={styles.switchRow}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{copy.convertPricesSetting}</Text>
            <Text style={styles.helper}>{copy.convertPricesBody}</Text>
          </View>
          <Switch
            accessibilityLabel={copy.convertPricesSetting}
            onValueChange={setConvertPrices}
            thumbColor="#FFFFFF"
            trackColor={{ false: palette.borderStrong, true: palette.primaryDeep }}
            value={convertPrices}
          />
        </View>
      </View>

      {currentUser ? (
        <>
          <Text style={styles.sectionLabel}>{copy.accountSection}</Text>
          <View style={styles.card}>
            <SettingRow
              icon="notifications-outline"
              onPress={() => {
                void Linking.openSettings();
              }}
              title={copy.notificationsSetting}
              value={pushNotificationsStatus.mode === "remote" ? copy.notificationsOn : copy.notificationsOff}
            />
            <SettingRow
              icon="albums-outline"
              onPress={() => navigation.navigate("MyContent")}
              title={copy.mcTitle}
              value={copy.mcSubtitleShort}
            />
            <SettingRow
              icon="log-out-outline"
              onPress={() => {
                void logout();
              }}
              title={copy.logout}
              value={`@${currentUser.username}`}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setConfirmText("");
              setDeleteOpen(true);
            }}
            style={({ pressed }) => [styles.dangerCard, pressed ? styles.rowPressed : null]}
          >
            <Ionicons color={palette.danger} name="trash-outline" size={20} />
            <View style={styles.rowText}>
              <Text style={styles.dangerTitle}>{copy.deleteAccountTitle}</Text>
              <Text style={styles.helper}>{copy.deleteAccountBody}</Text>
            </View>
          </Pressable>
        </>
      ) : null}

      <Modal animationType="fade" onRequestClose={() => setDeleteOpen(false)} transparent visible={deleteOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Ionicons color={palette.danger} name="warning-outline" size={32} />
            <Text style={styles.modalTitle}>{copy.deleteAccountTitle}</Text>
            <Text style={styles.modalBody}>{copy.deleteAccountWarning}</Text>
            <Text style={styles.modalBody}>{fill(copy.deleteAccountTypeToConfirm, { username: currentUser?.username ?? "" })}</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
              onChangeText={setConfirmText}
              placeholder={currentUser?.username ?? ""}
              placeholderTextColor={palette.mutedSoft}
              style={styles.modalInput}
              value={confirmText}
            />
            <View style={styles.modalActions}>
              <Pressable
                disabled={deleting}
                onPress={() => setDeleteOpen(false)}
                style={[styles.modalButton, styles.modalButtonGhost]}
              >
                <Text style={styles.modalButtonGhostLabel}>{copy.cancel}</Text>
              </Pressable>
              <Pressable
                disabled={deleting || confirmText.trim().replace(/^@/, "").toLowerCase() !== (currentUser?.username ?? "").toLowerCase()}
                onPress={() => {
                  setDeleting(true);
                  void deleteAccount().then((result) => {
                    setDeleting(false);
                    if (result.ok) {
                      setDeleteOpen(false);
                      Alert.alert(copy.deleteAccountDone);
                    } else {
                      Alert.alert(copy.deleteAccountFailed, result.message);
                    }
                  });
                }}
                style={[
                  styles.modalButton,
                  styles.modalButtonDanger,
                  confirmText.trim().replace(/^@/, "").toLowerCase() !== (currentUser?.username ?? "").toLowerCase()
                    ? styles.modalButtonDisabled
                    : null,
                ]}
              >
                {deleting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalButtonDangerLabel}>{copy.deleteAccountConfirm}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <SelectionSheet
        onClose={() => setOpenSheet(null)}
        onSelect={(value) => {
          setOpenSheet(null);
          if (isLanguageOption(value)) {
            void setLanguage(value);
          }
        }}
        options={languageOptions}
        selectedValue={language ?? "en"}
        title={copy.languageSetting}
        visible={openSheet === "language"}
      />
      <SelectionSheet
        onClose={() => setOpenSheet(null)}
        onSelect={(value) => {
          setOpenSheet(null);
          void setRegion(value);
        }}
        options={regionOptions}
        searchPlaceholder={copy.searchRegions}
        selectedValue={region}
        title={copy.chooseRegion}
        visible={openSheet === "region"}
      />
    </Screen>
  );
}

function SettingRow({
  icon,
  leading,
  title,
  value,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  leading?: string;
  title: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}>
      <View style={styles.rowIcon}>
        {leading ? <Text style={styles.rowLeading}>{leading}</Text> : <Ionicons color={palette.primary} name={icon} size={20} />}
      </View>
      <View style={styles.rowText}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.rowValue}>
          {value}
        </Text>
      </View>
      <Ionicons color={palette.muted} name="chevron-forward" size={20} style={rtlFlipStyle} />
    </Pressable>
  );
}

const styles = createThemedStyles({
  dangerCard: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.danger,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  dangerTitle: {
    color: palette.danger,
    fontSize: 16,
    fontWeight: "800",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  modalTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  modalBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  modalInput: {
    alignSelf: "stretch",
    backgroundColor: palette.input,
    borderRadius: radii.md,
    color: palette.text,
    fontSize: 16,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  modalActions: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    alignItems: "center",
    borderRadius: radii.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  modalButtonGhost: {
    backgroundColor: palette.surfaceMuted,
  },
  modalButtonGhostLabel: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
  modalButtonDanger: {
    backgroundColor: palette.danger,
  },
  modalButtonDisabled: {
    opacity: 0.45,
  },
  modalButtonDangerLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  switchRow: {
    alignItems: "center",
    borderTopColor: palette.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  sectionLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginTop: spacing.md,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  segment: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    flexDirection: "row",
    padding: 4,
  },
  segmentItem: {
    alignItems: "center",
    borderRadius: radii.pill,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 10,
  },
  segmentItemActive: {
    backgroundColor: palette.primaryDeep,
  },
  segmentLabel: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  segmentLabelActive: {
    color: "#FFFFFF",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: 4,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  rowLeading: {
    fontSize: 22,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
  },
  rowValue: {
    color: palette.muted,
    fontSize: 13,
  },
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  previewChip: {
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  previewText: {
    color: palette.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  helper: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
