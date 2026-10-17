import { fetchHelp, helpQueryKey, sendHelp, useHelp } from "@/backend/help";
import { Pill } from "@/components/booking/parts";
import { Button, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { useFieldSurfaceStyle } from "@/components/core/field";
import { LinkRow } from "@/components/handover/parts";
import { apiError } from "@/lib/api-error";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import {
  HelpAnswer,
  HelpRequest,
  NOTE_MAX,
  deskLine,
  deskState,
  helpErrorText,
  helpRowSub,
  noteHold,
  openRequest,
  requestLanded,
  requestStatus,
  sentAt,
  sentCopy,
} from "@/lib/help";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Platform, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

interface HelpBooking {
  number: string;
  can: string[];
}

interface SheetHandle {
  present: () => void;
}

/**
 * The note box. In a sheet the keyboard has to lift the sheet, which on iPhone only
 * the sheet's own input does, and Android resizes by itself: the same split the
 * taxonomy picker and the specs sheet make.
 */
function NoteBox({
  value,
  onChange,
  editable,
}: {
  value: string;
  onChange: (text: string) => void;
  editable: boolean;
}) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  const surface = useFieldSurfaceStyle({ focused, multiline: true, disabled: !editable });
  const Input = (Platform.OS === "ios" ? BottomSheetTextInput : TextInput) as typeof TextInput;
  return (
    <Input
      value={value}
      onChangeText={onChange}
      editable={editable}
      multiline
      maxLength={NOTE_MAX}
      placeholder="For example: the owner's shop looks closed."
      placeholderTextColor={color.placeholder}
      accessibilityLabel="What do you need help with"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        surface,
        { minHeight: 110, color: color.text, fontFamily: "PlusJakartaSans-Regular", fontSize: 16, textAlignVertical: "top" },
      ]}
    />
  );
}

/** A request the desk already has: its words, its state, when it was sent. */
function RequestCard({ request }: { request: HelpRequest }) {
  const { color } = useTheme();
  const status = requestStatus(request.status);
  return (
    <View
      accessible
      style={{ gap: space.xs, padding: space.md, borderRadius: 12, borderWidth: 1, borderColor: color.brandPanelLine, backgroundColor: color.brandPanel }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
          Your request
        </Text>
        {status ? <Pill label={status.label} tone={status.tone} /> : null}
      </View>
      <Text fontSize="text-sm" tone="body">
        {request.note}
      </Text>
      <Text fontSize="text-xs" tone="body">
        {sentAt(request, new Date())}
      </Text>
    </View>
  );
}

/**
 * The Get help sheet (ENG-238): the desk's hours as the server words them, the
 * requests this booking already has with the desk, and a note box. Sending makes
 * one request; the desk phones. Nothing is sent twice: a tap is held while it
 * goes, and a send whose answer was lost reads the desk's list before it lets
 * the person press again (the same rule as the dashboard's sheet).
 */
const GetHelpSheet = forwardRef<SheetHandle, { number: string }>(({ number }, ref) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const sheet = useRef<BottomSheetModal>(null);
  const busy = useRef(false);
  const query = useHelp(number);
  const answer = query.data;
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      present: () => {
        // A sheet opened again is a new request; the desk's list is read afresh.
        setSent(false);
        setError(null);
        void queryClient.invalidateQueries(helpQueryKey(number));
        sheet.current?.present();
      },
    }),
    [number, queryClient]
  );

  const remember = (request: HelpRequest | null) => {
    if (!request) return void queryClient.invalidateQueries(helpQueryKey(number));
    queryClient.setQueryData<HelpAnswer>(helpQueryKey(number), (old) => ({
      desk: old?.desk ?? null,
      requests: [request, ...(old?.requests ?? []).filter((r) => r.id !== request.id)],
    }));
  };

  const send = async () => {
    if (busy.current || noteHold(note)) return;
    busy.current = true;
    setSending(true);
    setError(null);
    const before = (answer?.requests ?? []).map((r) => r.id);
    try {
      const made = await sendHelp(number, note);
      if (made.desk) queryClient.setQueryData<HelpAnswer>(helpQueryKey(number), (old) => ({ desk: made.desk, requests: old?.requests ?? [] }));
      remember(made.request);
      setSent(true);
      setNote("");
    } catch (failure) {
      const refused = apiError(failure);
      // A refusal is the server's answer: nothing was made. No answer at all may mean it was
      // made and the answer was lost, so the desk's list says before another press is allowed.
      if (refused && refused.status > 0) {
        setError(helpErrorText(refused));
      } else {
        try {
          const now = await fetchHelp(number);
          queryClient.setQueryData(helpQueryKey(number), now);
          if (requestLanded(before, now.requests, { booking: number, note })) {
            setSent(true);
            setNote("");
          } else {
            setError("The request did not go through. Check your connection and try again.");
          }
        } catch {
          setError("We could not tell whether the request went through. If you try again the desk may get it twice.");
        }
      }
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  const hours = deskLine(answer?.desk);
  const state = deskState(answer?.desk);
  const waiting = answer ? openRequest(answer.requests, number) : null;
  const hold = noteHold(note);
  const done = sent ? sentCopy(answer?.desk) : null;

  return (
    <CustomBottomSheetModal ref={sheet} isDark={isDark} snapPoints={["80%"]} frame>
      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.md,
          gap: space.md,
        }}
      >
        <View style={{ gap: 2 }}>
          <Text role="sectionTitle" accessibilityRole="header">
            Get help
          </Text>
          <Text fontSize="text-sm" tone="body">
            {`About booking ${number}`}
          </Text>
        </View>

        {hours ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
              {hours}
            </Text>
            {state ? <Pill label={state} tone={answer?.desk?.is_open_now ? "success" : "neutral"} /> : null}
          </View>
        ) : query.isError ? (
          <Text fontSize="text-sm" tone="body">
            {"We couldn't read the desk's hours. You can still send your request."}
          </Text>
        ) : null}

        {done ? (
          <View accessibilityLiveRegion="polite" style={{ gap: space.xs }}>
            <Text fontSize="text-lg" fontWeight="font-bold" tone="success">
              {done.title}
            </Text>
            <Text fontSize="text-md" tone="body">
              {done.body}
            </Text>
          </View>
        ) : (
          <>
            {waiting ? <RequestCard request={waiting} /> : null}
            <Text fontSize="text-md" tone="body">
              {waiting
                ? "Need to add something? Send another note. There is no chat: the desk answers by phone."
                : "Tell Renit's desk what you need. There is no chat: the desk answers by phone."}
            </Text>
            <NoteBox value={note} onChange={setNote} editable={!sending} />
            {error ? (
              <Text fontSize="text-sm" tone="danger" accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
          </>
        )}

        <View style={{ gap: space.sm }}>
          {done ? (
            <Button onPress={() => sheet.current?.dismiss()}>Done</Button>
          ) : (
            <>
              <Button loading={sending} disabled={sending || hold !== null} onPress={() => void send()}>
                Send request
              </Button>
              <Button variant="ghost" disabled={sending} onPress={() => sheet.current?.dismiss()}>
                Close
              </Button>
            </>
          )}
        </View>
      </View>
    </CustomBottomSheetModal>
  );
});

/**
 * The one Get help button of a booking screen, with the desk's hours under it
 * (booking plan: "Every booking has one Get help button that reaches the desk, with
 * its hours shown"). It is a row for a card of rows: wrap it in a `Panel`, or put
 * it among the rows of one (`first={false}`). It shows only where the server's
 * `can` list offers `get_help`, so it never offers what the server would refuse.
 */
export function GetHelp({ booking, first = true }: { booking: HelpBooking; first?: boolean }) {
  const sheet = useRef<SheetHandle>(null);
  const offered = booking.can.includes("get_help");
  const query = useHelp(booking.number, offered);
  if (!offered) return null;
  return (
    <>
      <LinkRow title="Get help" sub={helpRowSub(query.data, booking.number)} first={first} onPress={() => sheet.current?.present()} />
      <GetHelpSheet ref={sheet} number={booking.number} />
    </>
  );
}
