import React, { useMemo, useRef, useState } from 'react';
import LockViewersContainer from '/imports/ui/components/lock-viewers/container';
import GuestPolicyContainer from '/imports/ui/components/waiting-users/guest-policy/container';
import CreateBreakoutRoomContainerGraphql from '../../../../breakout-room/breakout-room-graphql/create-breakout-room/component';
import WriterMenuContainer from '/imports/ui/components/captions/writer-menu/container';
import BBBMenu from '/imports/ui/components/common/menu/component';
import Styled from './styles';
import { defineMessages, useIntl } from 'react-intl';
import { layoutSelect } from '/imports/ui/components/layout/context';
import { Layout } from '/imports/ui/components/layout/layoutTypes';
import { uid } from 'radash';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import { Meeting } from '/imports/ui/Types/meeting';
import {
  onSaveUserNames, openLearningDashboardUrl, toggleMuteAllUsers, toggleMuteAllUsersExceptPresenter, toggleStatus,
} from './service';
import { User } from '/imports/ui/Types/user';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { isBreakoutRoomsEnabled, isLearningDashboardEnabled, isCaptionsEnabled } from '/imports/ui/services/features';

const intlMessages = defineMessages({
  optionsLabel: {
    id: 'app.userList.userOptions.manageUsersLabel',
    description: 'Manage user label',
  },
  clearAllLabel: {
    id: 'app.userList.userOptions.clearAllLabel',
    description: 'Clear all label',
  },
  clearAllDesc: {
    id: 'app.userList.userOptions.clearAllDesc',
    description: 'Clear all description',
  },
  muteAllLabel: {
    id: 'app.userList.userOptions.muteAllLabel',
    description: 'Mute all label',
  },
  muteAllDesc: {
    id: 'app.userList.userOptions.muteAllDesc',
    description: 'Mute all description',
  },
  unmuteAllLabel: {
    id: 'app.userList.userOptions.unmuteAllLabel',
    description: 'Unmute all label',
  },
  unmuteAllDesc: {
    id: 'app.userList.userOptions.unmuteAllDesc',
    description: 'Unmute all desc',
  },
  lockViewersLabel: {
    id: 'app.userList.userOptions.lockViewersLabel',
    description: 'Lock viewers label',
  },
  lockViewersDesc: {
    id: 'app.userList.userOptions.lockViewersDesc',
    description: 'Lock viewers description',
  },
  guestPolicyLabel: {
    id: 'app.userList.userOptions.guestPolicyLabel',
    description: 'Guest policy label',
  },
  guestPolicyDesc: {
    id: 'app.userList.userOptions.guestPolicyDesc',
    description: 'Guest policy description',
  },
  muteAllExceptPresenterLabel: {
    id: 'app.userList.userOptions.muteAllExceptPresenterLabel',
    description: 'Mute all except presenter label',
  },
  muteAllExceptPresenterDesc: {
    id: 'app.userList.userOptions.muteAllExceptPresenterDesc',
    description: 'Mute all except presenter description',
  },
  createBreakoutRoom: {
    id: 'app.actionsBar.actionsDropdown.createBreakoutRoom',
    description: 'Create breakout room option',
  },
  createBreakoutRoomDesc: {
    id: 'app.actionsBar.actionsDropdown.createBreakoutRoomDesc',
    description: 'Description of create breakout room option',
  },
  learningDashboardLabel: {
    id: 'app.learning-dashboard.label',
    description: 'Activity Report label',
  },
  learningDashboardDesc: {
    id: 'app.learning-dashboard.description',
    description: 'Activity Report description',
  },
  saveUserNames: {
    id: 'app.actionsBar.actionsDropdown.saveUserNames',
    description: 'Save user name feature description',
  },
  captionsLabel: {
    id: 'app.actionsBar.actionsDropdown.captionsLabel',
    description: 'Captions menu toggle label',
  },
  captionsDesc: {
    id: 'app.actionsBar.actionsDropdown.captionsDesc',
    description: 'Captions menu toggle description',
  },
  newTab: {
    id: 'app.modal.newTab',
    description: 'label used in aria description',
  },
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - temporary, while meteor exists in the project
const { dynamicGuestPolicy } = Meteor.settings.public.app;

interface RenderModalProps {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isOpen: boolean;
  priority: string;
  /* Use 'any' if you don't have specific props;
   As this props varies in types usage of any is most apropriate */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: React.ComponentType<any>;
  otherOptions: object;
}

const renderModal: React.FC<RenderModalProps> = ({
  isOpen, setIsOpen, priority, Component, otherOptions,
}) => {
  if (isOpen) {
    return (
      <Component
        onRequestClose={() => setIsOpen(false)}
        priority={priority}
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...otherOptions}
      />
    );
  }
  return null;
};
interface UserTitleOptionsProps {
  isRTL: boolean;
  isMeetingMuted: boolean | undefined;
  isBreakout: boolean | undefined;
  isModerator: boolean;
  hasBreakoutRooms: boolean | undefined;
  meetingName: string | undefined;
}

const UserTitleOptions: React.FC<UserTitleOptionsProps> = ({
  isRTL,
  isMeetingMuted = false,
  isBreakout,
  isModerator,
  hasBreakoutRooms,
  meetingName,
}) => {
  const intl = useIntl();
  const { locale } = intl;
  const uuids = useRef<string[]>([
    uid(8, 'options-'),
    uid(8, 'options-'),
    uid(8, 'options-'),
    uid(8, 'options-'),
    uid(8, 'options-'),
    uid(8, 'options-'),
    uid(8, 'options-'),
    uid(8, 'options-'),
    uid(8, 'options-'),
  ]);
  const [isCreateBreakoutRoomModalOpen, setCreateBreakoutRoomModalIsOpen] = useState(false);
  const [isGuestPolicyModalOpen, setGuestPolicyModalIsOpen] = useState(false);
  const [isLockViewersModalOpen, setLockViewersModalIsOpen] = useState(false);
  const [isWriterMenuModalOpen, setIsWriterMenuModalOpen] = useState(false);

  const actions = useMemo(() => {
    const canCreateBreakout = isModerator
      && !isBreakout
      && !hasBreakoutRooms
      && isBreakoutRoomsEnabled();
    return [
      {
        allow: !isBreakout,
        key: uuids.current[0],
        label: intl.formatMessage(intlMessages[isMeetingMuted ? 'unmuteAllLabel' : 'muteAllLabel']),
        description: intl.formatMessage(intlMessages[isMeetingMuted ? 'unmuteAllDesc' : 'muteAllDesc']),
        onClick: toggleMuteAllUsers.bind(null, !isMeetingMuted),
        icon: isMeetingMuted ? 'unmute' : 'mute',
        dataTest: 'muteAll',
      },
      {
        allow: !isMeetingMuted,
        key: uuids.current[1],
        label: intl.formatMessage(intlMessages.muteAllExceptPresenterLabel),
        description: intl.formatMessage(intlMessages.muteAllExceptPresenterDesc),
        onClick: toggleMuteAllUsersExceptPresenter.bind(null, isMeetingMuted),
        icon: 'mute',
        dataTest: 'muteAllExceptPresenter',
      },
      {
        allow: true,
        key: uuids.current[2],
        label: intl.formatMessage(intlMessages.lockViewersLabel),
        description: intl.formatMessage(intlMessages.lockViewersDesc),
        onClick: () => setLockViewersModalIsOpen(true),
        icon: 'lock',
        dataTest: 'lockViewersButton',
      },
      {
        allow: dynamicGuestPolicy,
        key: uuids.current[3],
        icon: 'user',
        label: intl.formatMessage(intlMessages.guestPolicyLabel),
        description: intl.formatMessage(intlMessages.guestPolicyDesc),
        onClick: () => setGuestPolicyModalIsOpen(true),
        dataTest: 'guestPolicyLabel',
      },
      {
        allow: isModerator,
        key: uuids.current[4],
        label: intl.formatMessage(intlMessages.saveUserNames),
        onClick: onSaveUserNames.bind(null, intl, meetingName ?? ''),
        icon: 'download',
        dataTest: 'downloadUserNamesList',
      },
      {
        allow: true,
        key: uuids.current[5],
        label: intl.formatMessage(intlMessages.clearAllLabel),
        description: intl.formatMessage(intlMessages.clearAllDesc),
        onClick: toggleStatus.bind(null, intl),
        icon: 'clear_status',
      },
      {
        key: 'separator-01',
        isSeparator: true,
        allow: true,
      },
      {
        allow: canCreateBreakout,
        key: uuids.current[6],
        icon: 'rooms',
        label: intl.formatMessage(intlMessages.createBreakoutRoom),
        description: intl.formatMessage(intlMessages.createBreakoutRoomDesc),
        onClick: () => setCreateBreakoutRoomModalIsOpen(true),
        dataTest: 'createBreakoutRooms',
      },
      {
        allow: isModerator && isCaptionsEnabled(),
        icon: 'closed_caption',
        label: intl.formatMessage(intlMessages.captionsLabel),
        description: intl.formatMessage(intlMessages.captionsDesc),
        key: uuids.current[7],
        onClick: () => setIsWriterMenuModalOpen(true),
        dataTest: 'writeClosedCaptions',
      },
      {
        key: 'separator-02',
        isSeparator: true,
        allow: true,
      },
      {
        allow: isLearningDashboardEnabled(),
        icon: 'multi_whiteboard',
        iconRight: 'popout_window',
        label: intl.formatMessage(intlMessages.learningDashboardLabel),
        description: `${intl.formatMessage(intlMessages.learningDashboardDesc)}
        ${intl.formatMessage(intlMessages.newTab)}`,
        key: uuids.current[8],
        onClick: () => { openLearningDashboardUrl(locale); },
        dividerTop: true,
        dataTest: 'learningDashboard',
      },
    ].filter(({ allow }) => allow);
  }, [isModerator, hasBreakoutRooms, isMeetingMuted, locale]);

  const newLocal = 'true';
  return (
    <>
      <BBBMenu
        trigger={(
          <Styled.OptionsButton
            label={intl.formatMessage(intlMessages.optionsLabel)}
            data-test="manageUsers"
            icon="settings"
            color="light"
            hideLabel
            size="md"
            circle
            onClick={() => null}
          />
        )}
        actions={actions}
        opts={{
          id: 'user-options-dropdown-menu',
          keepMounted: true,
          transitionDuration: 0,
          elevation: 3,
          getcontentanchorel: null,
          fullwidth: newLocal,
          anchorOrigin: { vertical: 'bottom', horizontal: isRTL ? 'right' : 'left' },
          transformOrigin: { vertical: 'top', horizontal: isRTL ? 'right' : 'left' },
        }}
      />
      {renderModal({
        isOpen: isCreateBreakoutRoomModalOpen,
        setIsOpen: setCreateBreakoutRoomModalIsOpen,
        priority: 'medium',
        Component: CreateBreakoutRoomContainerGraphql,
        otherOptions: {},
      })}

      {renderModal({
        isOpen: isGuestPolicyModalOpen,
        setIsOpen: setGuestPolicyModalIsOpen,
        priority: 'low',
        Component: GuestPolicyContainer,
        otherOptions: {},
      })}

      {renderModal({
        isOpen: isWriterMenuModalOpen,
        setIsOpen: setIsWriterMenuModalOpen,
        priority: 'low',
        Component: WriterMenuContainer,
        otherOptions: {},
      })}

      {renderModal({
        isOpen: isLockViewersModalOpen,
        setIsOpen: setLockViewersModalIsOpen,
        priority: 'low',
        Component: LockViewersContainer,
        otherOptions: {},
      })}

    </>
  );
};

const UserTitleOptionsContainer: React.FC = () => {
  const isRTL = layoutSelect((i: Layout) => i.isRTL);
  const { data: meetingInfo } = useMeeting((meeting: Partial<Meeting>) => ({
    voiceSettings: meeting?.voiceSettings,
    isBreakout: meeting?.isBreakout,
    breakoutPolicies: meeting?.breakoutPolicies,
    name: meeting?.name,
  }));

  const { data: currentUser } = useCurrentUser((user: Partial<User>) => ({
    userId: user?.userId,
    isModerator: user?.isModerator,
  }));
  // in case of current user isn't load yet
  if (!currentUser?.isModerator ?? true) return null;

  return (
    <UserTitleOptions
      isRTL={isRTL}
      isMeetingMuted={meetingInfo?.voiceSettings?.muteOnStart}
      isBreakout={meetingInfo?.isBreakout}
      isModerator={currentUser?.isModerator ?? false}
      hasBreakoutRooms={meetingInfo?.breakoutPolicies?.breakoutRooms !== undefined
        && meetingInfo.breakoutPolicies.breakoutRooms.length > 0}
      meetingName={meetingInfo?.name}
    />
  );
};

export default UserTitleOptionsContainer;
