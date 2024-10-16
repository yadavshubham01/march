import React from "react"

import { SkeletonCard } from "./atoms/SkeletonCard"
import { useMeetings } from "../hooks/useMeetings"
import { Link as LinkIcon } from "../lib/icons/Link"

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

const calculateDuration = (start: Date, end: Date): number => {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
}

interface TodayAgendaProps {
  selectedDate: Date
}

export const TodayMeetings: React.FC<TodayAgendaProps> = ({ selectedDate }) => {
  const { meetings, isLoading } = useMeetings()

  const todayMeetings = meetings?.meetings.filter((meeting) =>
    isSameDay(new Date(meeting.start.dateTime), selectedDate)
  )

  const agendaItems =
    todayMeetings?.map((meeting) => {
      const startTime = new Date(meeting.start.dateTime)
      const endTime = new Date(meeting.end.dateTime)
      return {
        title: meeting.summary,
        link: meeting.hangoutLink,
        time: `${formatTime(startTime)} - ${formatTime(endTime)}`,
        duration: calculateDuration(startTime, endTime),
      }
    }) || []

  if (isLoading) {
    return (
      <ol>
        <li className="text-lg font-medium text-[#DCDCDD]/80">
          <SkeletonCard />
        </li>
      </ol>
    )
  }

  return (
    <ol className="text-[16px]">
      {agendaItems.length === 0 ? (
        <li className="text-lg font-medium text-[#DCDCDD]/80">
          No agenda items
        </li>
      ) : (
        agendaItems.map((item, index) => (
          <React.Fragment key={index}>
            <li className="font-medium text-primary-foreground/80">
              {item.title}
            </li>
            <p className="mt-1">
              {item.time}, {item.duration} min
            </p>
            <a
              href={item.link}
              target="_blank"
              className="mb-8 mt-4 flex items-center justify-start gap-2 text-primary-foreground"
            >
              Join Meeting
              <span>
                <LinkIcon />
              </span>
            </a>
          </React.Fragment>
        ))
      )}
    </ol>
  )
}
