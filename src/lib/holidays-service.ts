// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File path locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
// Rule #6: the dashboard already and all files already created and structured.
// File path: lib/holidays-service.ts

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD format
  type: 'federal' | 'observance' | 'religious' | 'cultural' | 'seasonal' | 'awareness';
  description?: string;
  isRecurring: boolean;
  color?: string;
  category?: string;
}

export interface HolidayRule {
  name: string;
  type: 'federal' | 'observance' | 'religious' | 'cultural' | 'seasonal' | 'awareness';
  description?: string;
  color?: string;
  category?: string;
  rule: (year: number) => Date;
}

// Utility functions for date calculations
const getNthWeekdayOfMonth = (year: number, month: number, weekday: number, n: number): Date => {
  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = firstDay.getDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  const date = 1 + offset + (n - 1) * 7;
  return new Date(year, month - 1, date);
};

const getLastWeekdayOfMonth = (year: number, month: number, weekday: number): Date => {
  const lastDay = new Date(year, month, 0);
  const lastWeekday = lastDay.getDay();
  const offset = (lastWeekday - weekday + 7) % 7;
  const date = lastDay.getDate() - offset;
  return new Date(year, month - 1, date);
};

const getEasterSunday = (year: number): Date => {
  // Algorithm to calculate Easter Sunday
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

// Holiday rules for calculating dates
const HOLIDAY_RULES: HolidayRule[] = [
  // Federal Holidays
  {
    name: "New Year's Day",
    type: 'federal',
    description: "The first day of the Gregorian calendar year",
    color: '#3B82F6',
    category: 'Federal Holiday',
    rule: (year) => new Date(year, 0, 1)
  },
  {
    name: "Martin Luther King Jr. Day",
    type: 'federal',
    description: "Honoring the civil rights leader",
    color: '#8B5CF6',
    category: 'Federal Holiday',
    rule: (year) => getNthWeekdayOfMonth(year, 1, 1, 3) // 3rd Monday in January
  },
  {
    name: "Presidents' Day",
    type: 'federal',
    description: "Honoring all U.S. presidents",
    color: '#EF4444',
    category: 'Federal Holiday',
    rule: (year) => getNthWeekdayOfMonth(year, 2, 1, 3) // 3rd Monday in February
  },
  {
    name: "Memorial Day",
    type: 'federal',
    description: "Honoring military personnel who died in service",
    color: '#DC2626',
    category: 'Federal Holiday',
    rule: (year) => getLastWeekdayOfMonth(year, 5, 1) // Last Monday in May
  },
  {
    name: "Juneteenth",
    type: 'federal',
    description: "Commemorating the end of slavery in the United States",
    color: '#059669',
    category: 'Federal Holiday',
    rule: (year) => new Date(year, 5, 19) // June 19
  },
  {
    name: "Independence Day",
    type: 'federal',
    description: "Celebrating the Declaration of Independence",
    color: '#DC2626',
    category: 'Federal Holiday',
    rule: (year) => new Date(year, 6, 4) // July 4
  },
  {
    name: "Labor Day",
    type: 'federal',
    description: "Celebrating the contributions of workers",
    color: '#7C3AED',
    category: 'Federal Holiday',
    rule: (year) => getNthWeekdayOfMonth(year, 9, 1, 1) // 1st Monday in September
  },
  {
    name: "Columbus Day",
    type: 'federal',
    description: "Commemorating Christopher Columbus's arrival in the Americas",
    color: '#F59E0B',
    category: 'Federal Holiday',
    rule: (year) => getNthWeekdayOfMonth(year, 10, 1, 2) // 2nd Monday in October
  },
  {
    name: "Veterans Day",
    type: 'federal',
    description: "Honoring military veterans",
    color: '#B91C1C',
    category: 'Federal Holiday',
    rule: (year) => new Date(year, 10, 11) // November 11
  },
  {
    name: "Thanksgiving Day",
    type: 'federal',
    description: "A day of thanksgiving and gratitude",
    color: '#D97706',
    category: 'Federal Holiday',
    rule: (year) => getNthWeekdayOfMonth(year, 11, 4, 4) // 4th Thursday in November
  },
  {
    name: "Christmas Day",
    type: 'federal',
    description: "Celebrating the birth of Jesus Christ",
    color: '#059669',
    category: 'Federal Holiday',
    rule: (year) => new Date(year, 11, 25) // December 25
  },

  // Major Observances
  {
    name: "Groundhog Day",
    type: 'observance',
    description: "Traditional weather prediction day",
    color: '#8B5CF6',
    category: 'Traditional',
    rule: (year) => new Date(year, 1, 2)
  },
  {
    name: "Valentine's Day",
    type: 'observance',
    description: "Day of love and romance",
    color: '#EC4899',
    category: 'Cultural',
    rule: (year) => new Date(year, 1, 14)
  },
  {
    name: "St. Patrick's Day",
    type: 'observance',
    description: "Irish cultural celebration",
    color: '#10B981',
    category: 'Cultural',
    rule: (year) => new Date(year, 2, 17)
  },
  {
    name: "April Fools' Day",
    type: 'observance',
    description: "Day of pranks and jokes",
    color: '#F59E0B',
    category: 'Cultural',
    rule: (year) => new Date(year, 3, 1)
  },
  {
    name: "Earth Day",
    type: 'observance',
    description: "Environmental awareness day",
    color: '#059669',
    category: 'Environmental',
    rule: (year) => new Date(year, 3, 22)
  },
  {
    name: "Mother's Day",
    type: 'observance',
    description: "Honoring mothers and maternal figures",
    color: '#EC4899',
    category: 'Family',
    rule: (year) => getNthWeekdayOfMonth(year, 5, 0, 2) // 2nd Sunday in May
  },
  {
    name: "Father's Day",
    type: 'observance',
    description: "Honoring fathers and paternal figures",
    color: '#3B82F6',
    category: 'Family',
    rule: (year) => getNthWeekdayOfMonth(year, 6, 0, 3) // 3rd Sunday in June
  },
  {
    name: "Halloween",
    type: 'observance',
    description: "Traditional costume and trick-or-treat day",
    color: '#F97316',
    category: 'Traditional',
    rule: (year) => new Date(year, 9, 31)
  },
  {
    name: "Black Friday",
    type: 'observance',
    description: "Major shopping day after Thanksgiving",
    color: '#1F2937',
    category: 'Commercial',
    rule: (year) => {
      const thanksgiving = getNthWeekdayOfMonth(year, 11, 4, 4);
      return new Date(thanksgiving.getTime() + 24 * 60 * 60 * 1000);
    }
  },

  // Religious Holidays
  {
    name: "Good Friday",
    type: 'religious',
    description: "Christian observance of Jesus's crucifixion",
    color: '#7C3AED',
    category: 'Christian',
    rule: (year) => {
      const easter = getEasterSunday(year);
      return new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000);
    }
  },
  {
    name: "Easter Sunday",
    type: 'religious',
    description: "Christian celebration of Jesus's resurrection",
    color: '#F59E0B',
    category: 'Christian',
    rule: (year) => getEasterSunday(year)
  },

  // Seasonal Events
  {
    name: "Spring Equinox",
    type: 'seasonal',
    description: "First day of spring",
    color: '#10B981',
    category: 'Seasonal',
    rule: (year) => new Date(year, 2, 20) // Approximate date
  },
  {
    name: "Summer Solstice",
    type: 'seasonal',
    description: "Longest day of the year",
    color: '#F59E0B',
    category: 'Seasonal',
    rule: (year) => new Date(year, 5, 21) // Approximate date
  },
  {
    name: "Autumn Equinox",
    type: 'seasonal',
    description: "First day of autumn",
    color: '#D97706',
    category: 'Seasonal',
    rule: (year) => new Date(year, 8, 22) // Approximate date
  },
  {
    name: "Winter Solstice",
    type: 'seasonal',
    description: "Shortest day of the year",
    color: '#3B82F6',
    category: 'Seasonal',
    rule: (year) => new Date(year, 11, 21) // Approximate date
  },

  // Awareness Months & Weeks (Monthly observances)
  {
    name: "National Heart Month",
    type: 'awareness',
    description: "Cardiovascular health awareness",
    color: '#DC2626',
    category: 'Health',
    rule: (year) => new Date(year, 1, 1) // February
  },
  {
    name: "Women's History Month",
    type: 'awareness',
    description: "Celebrating women's contributions to history",
    color: '#EC4899',
    category: 'History',
    rule: (year) => new Date(year, 2, 1) // March
  },
  {
    name: "Autism Awareness Month",
    type: 'awareness',
    description: "Autism spectrum disorder awareness",
    color: '#3B82F6',
    category: 'Health',
    rule: (year) => new Date(year, 3, 1) // April
  },
  {
    name: "Mental Health Awareness Month",
    type: 'awareness',
    description: "Mental health education and advocacy",
    color: '#10B981',
    category: 'Health',
    rule: (year) => new Date(year, 4, 1) // May
  },
  {
    name: "Pride Month",
    type: 'awareness',
    description: "LGBTQ+ pride and civil rights",
    color: '#8B5CF6',
    category: 'Civil Rights',
    rule: (year) => new Date(year, 5, 1) // June
  },
  {
    name: "National Breast Cancer Awareness Month",
    type: 'awareness',
    description: "Breast cancer awareness and prevention",
    color: '#EC4899',
    category: 'Health',
    rule: (year) => new Date(year, 9, 1) // October
  },
  {
    name: "National Diabetes Month",
    type: 'awareness',
    description: "Diabetes awareness and prevention",
    color: '#3B82F6',
    category: 'Health',
    rule: (year) => new Date(year, 10, 1) // November
  },

  // Special Cultural Events
  {
    name: "Cinco de Mayo",
    type: 'cultural',
    description: "Mexican-American cultural celebration",
    color: '#059669',
    category: 'Cultural',
    rule: (year) => new Date(year, 4, 5)
  },
  {
    name: "National Day of Prayer",
    type: 'observance',
    description: "Annual day of prayer in the United States",
    color: '#7C3AED',
    category: 'Religious',
    rule: (year) => getNthWeekdayOfMonth(year, 5, 4, 1) // 1st Thursday in May
  },
  {
    name: "Flag Day",
    type: 'observance',
    description: "Celebrating the adoption of the U.S. flag",
    color: '#DC2626',
    category: 'Patriotic',
    rule: (year) => new Date(year, 5, 14)
  },
  {
    name: "Constitution Day",
    type: 'observance',
    description: "Commemorating the signing of the U.S. Constitution",
    color: '#3B82F6',
    category: 'Patriotic',
    rule: (year) => new Date(year, 8, 17)
  },
  {
    name: "Indigenous Peoples' Day",
    type: 'observance',
    description: "Honoring Indigenous peoples and their histories",
    color: '#D97706',
    category: 'Cultural',
    rule: (year) => getNthWeekdayOfMonth(year, 10, 1, 2) // 2nd Monday in October (same as Columbus Day)
  },

  // Technology and Modern Observances
  {
    name: "National Technology Day",
    type: 'observance',
    description: "Celebrating technological achievements",
    color: '#6366F1',
    category: 'Technology',
    rule: (year) => new Date(year, 0, 6) // January 6
  },
  {
    name: "World Password Day",
    type: 'awareness',
    description: "Cybersecurity and password awareness",
    color: '#EF4444',
    category: 'Technology',
    rule: (year) => getNthWeekdayOfMonth(year, 5, 4, 1) // 1st Thursday in May
  },
  {
    name: "National Cyber Security Awareness Month",
    type: 'awareness',
    description: "Cybersecurity education and awareness",
    color: '#1F2937',
    category: 'Technology',
    rule: (year) => new Date(year, 9, 1) // October
  }
];

export class HolidayService {
  private static instance: HolidayService;

  private constructor() {}

  static getInstance(): HolidayService {
    if (!HolidayService.instance) {
      HolidayService.instance = new HolidayService();
    }
    return HolidayService.instance;
  }

  // Get all holidays for a specific year
  getHolidaysForYear(year: number): Holiday[] {
    const holidays: Holiday[] = [];

    HOLIDAY_RULES.forEach((rule, index) => {
      try {
        const date = rule.rule(year);
        const holiday: Holiday = {
          id: `holiday_${year}_${index}`,
          name: rule.name,
          date: this.formatDate(date),
          type: rule.type,
          description: rule.description,
          isRecurring: true,
          color: rule.color,
          category: rule.category
        };
        holidays.push(holiday);
      } catch (error) {
        console.warn(`Error calculating holiday ${rule.name} for year ${year}:`, error);
      }
    });

    return holidays.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Get holidays for a specific month
  getHolidaysForMonth(year: number, month: number): Holiday[] {
    const allHolidays = this.getHolidaysForYear(year);
    const monthStr = month.toString().padStart(2, '0');
    return allHolidays.filter(holiday => 
      holiday.date.startsWith(`${year}-${monthStr}`)
    );
  }

  // Get holidays for a specific date
  getHolidaysForDate(date: Date): Holiday[] {
    const year = date.getFullYear();
    const dateStr = this.formatDate(date);
    const allHolidays = this.getHolidaysForYear(year);
    return allHolidays.filter(holiday => holiday.date === dateStr);
  }

  // Get holidays within a date range
  getHolidaysInRange(startDate: Date, endDate: Date): Holiday[] {
    const holidays: Holiday[] = [];
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const startDateStr = this.formatDate(startDate);
    const endDateStr = this.formatDate(endDate);

    for (let year = startYear; year <= endYear; year++) {
      const yearHolidays = this.getHolidaysForYear(year);
      const filteredHolidays = yearHolidays.filter(holiday => 
        holiday.date >= startDateStr && holiday.date <= endDateStr
      );
      holidays.push(...filteredHolidays);
    }

    return holidays.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Get holidays by type
  getHolidaysByType(year: number, type: Holiday['type']): Holiday[] {
    const allHolidays = this.getHolidaysForYear(year);
    return allHolidays.filter(holiday => holiday.type === type);
  }

  // Get federal holidays only
  getFederalHolidays(year: number): Holiday[] {
    return this.getHolidaysByType(year, 'federal');
  }

  // Check if a date is a federal holiday
  isFederalHoliday(date: Date): boolean {
    const year = date.getFullYear();
    const federalHolidays = this.getFederalHolidays(year);
    const dateStr = this.formatDate(date);
    return federalHolidays.some(holiday => holiday.date === dateStr);
  }

  // Get upcoming holidays (next N holidays from current date)
  getUpcomingHolidays(count: number = 5, fromDate: Date = new Date()): Holiday[] {
    const currentYear = fromDate.getFullYear();
    const nextYear = currentYear + 1;
    const fromDateStr = this.formatDate(fromDate);
    
    const currentYearHolidays = this.getHolidaysForYear(currentYear)
      .filter(holiday => holiday.date >= fromDateStr);
    
    if (currentYearHolidays.length >= count) {
      return currentYearHolidays.slice(0, count);
    }
    
    const nextYearHolidays = this.getHolidaysForYear(nextYear);
    const allUpcoming = [...currentYearHolidays, ...nextYearHolidays];
    
    return allUpcoming.slice(0, count);
  }

  // Get holiday categories
  getHolidayCategories(): string[] {
    const categories = new Set<string>();
    HOLIDAY_RULES.forEach(rule => {
      if (rule.category) {
        categories.add(rule.category);
      }
    });
    return Array.from(categories).sort();
  }

  // Get holiday types
  getHolidayTypes(): Holiday['type'][] {
    return ['federal', 'observance', 'religious', 'cultural', 'seasonal', 'awareness'];
  }

  // Search holidays by name
  searchHolidays(year: number, query: string): Holiday[] {
    const allHolidays = this.getHolidaysForYear(year);
    const searchTerm = query.toLowerCase();
    
    return allHolidays.filter(holiday =>
      holiday.name.toLowerCase().includes(searchTerm) ||
      holiday.description?.toLowerCase().includes(searchTerm) ||
      holiday.category?.toLowerCase().includes(searchTerm)
    );
  }

  // Format date to YYYY-MM-DD
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Convert holiday to agenda event format
  holidayToAgendaEvent(holiday: Holiday): any {
    return {
      id: holiday.id,
      title: holiday.name,
      description: holiday.description,
      date: holiday.date,
      time: 'All Day',
      source: 'holiday',
      isRecurring: holiday.isRecurring,
      color: holiday.color,
      category: holiday.category,
      type: holiday.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Get holidays as agenda events
  getHolidaysAsAgendaEvents(year: number): any[] {
    return this.getHolidaysForYear(year).map(holiday => 
      this.holidayToAgendaEvent(holiday)
    );
  }

  // Get holiday statistics
  getHolidayStats(year: number): Record<string, number> {
    const holidays = this.getHolidaysForYear(year);
    const stats: Record<string, number> = {};
    
    // Count by type
    holidays.forEach(holiday => {
      stats[holiday.type] = (stats[holiday.type] || 0) + 1;
    });
    
    // Total count
    stats.total = holidays.length;
    
    return stats;
  }
}

// Export singleton instance
export const holidayService = HolidayService.getInstance();