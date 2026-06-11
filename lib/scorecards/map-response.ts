import type { DepartmentScorecardResult } from "@/lib/scorecards/query-department";
import type { EmployeeScorecardResult } from "@/lib/scorecards/query-employee";
import type { HotelScorecardResult } from "@/lib/scorecards/query-hotel";

function mapMetricsBase(
  metrics: {
    feedbackCount: number;
    avgRating: number | null;
    npsInternal: number | null;
    insufficientData: boolean;
    pctPromoters: number;
    pctDetractors: number;
    message?: string;
  },
) {
  const base = {
    feedbackCount: metrics.feedbackCount,
    avgRating: metrics.avgRating,
    npsInternal: metrics.npsInternal,
    insufficientData: metrics.insufficientData,
    pctPromoters: metrics.pctPromoters,
    pctDetractors: metrics.pctDetractors,
  };

  if (metrics.message) {
    return { ...base, message: metrics.message };
  }
  return base;
}

export function mapEmployeeResponse(data: EmployeeScorecardResult) {
  return {
    level: "employee" as const,
    staffMemberId: data.staffMemberId,
    displayName: data.displayName,
    departmentName: data.departmentName,
    period: { from: data.period.fromIso, to: data.period.toIso },
    metrics: {
      ...mapMetricsBase(data.metrics),
      incidentCountLinked: data.metrics.incidentCountLinked,
      trend7d: {
        npsInternal: data.metrics.trend7d.npsInternal,
        feedbackCount: data.metrics.trend7d.feedbackCount,
      },
    },
  };
}

export function mapDepartmentResponse(data: DepartmentScorecardResult) {
  const response: Record<string, unknown> = {
    level: "department" as const,
    departmentId: data.departmentId,
    departmentName: data.departmentName,
    period: { from: data.period.fromIso, to: data.period.toIso },
    metrics: {
      feedbackCount: data.metrics.feedbackCount,
      npsInternal: data.metrics.npsInternal,
      insufficientData: data.metrics.insufficientData,
      avgRating: data.metrics.avgRating,
      openIncidents: data.metrics.openIncidents,
      closedIncidents: data.metrics.closedIncidents,
      employeeRanking: data.metrics.employeeRanking,
    },
    shifts: data.shifts.map((shift) => ({
      shiftId: shift.shiftId,
      shiftName: shift.shiftName,
      feedbackCount: shift.feedbackCount,
      npsInternal: shift.npsInternal,
      insufficientData: shift.insufficientData,
    })),
  };

  if (data.comments) {
    response.comments = data.comments;
  }

  return response;
}

export function mapHotelResponse(data: HotelScorecardResult) {
  return {
    level: "hotel" as const,
    venueId: data.venueId,
    venueName: data.venueName,
    period: { from: data.period.fromIso, to: data.period.toIso },
    metrics: {
      feedbackCount: data.metrics.feedbackCount,
      npsInternal: data.metrics.npsInternal,
      insufficientData: data.metrics.insufficientData,
      avgRating: data.metrics.avgRating,
      incidentRatePer100Stays: data.metrics.incidentRatePer100Stays,
      captureCoveragePct: data.metrics.captureCoveragePct,
      openIncidents: data.metrics.openIncidents,
      departments: data.metrics.departments,
    },
  };
}