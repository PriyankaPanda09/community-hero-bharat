import { CivicIssue } from "./types";

const SPREADSHEET_ID = "1bam7ABy6p6Th38WkPAZUyRXIokmJ4Kb2Q2ETzKGwE-0";

const rowToIssue = (row: any[]): CivicIssue => {
  return {
    id: row[0] || "",
    photoUrl: row[1] || "",
    category: (row[2] || "other") as any,
    severity: (row[3] || "low") as any,
    description: row[4] || "",
    location: {
      address: row[5] || "",
      lat: row[6] ? parseFloat(row[6]) : undefined,
      lng: row[7] ? parseFloat(row[7]) : undefined,
    },
    status: (row[8] || "Open") as any,
    reporterId: row[9] || "",
    reporterName: row[10] || "",
    reporterEmail: row[11] || "",
    reporterPhoto: row[12] || undefined,
    note: row[13] || undefined,
    timestamp: row[14] || "",
  };
};

const issueToRow = (issue: CivicIssue): any[] => {
  return [
    issue.id,
    issue.photoUrl,
    issue.category,
    issue.severity,
    issue.description,
    issue.location.address,
    issue.location.lat ?? "",
    issue.location.lng ?? "",
    issue.status,
    issue.reporterId,
    issue.reporterName,
    issue.reporterEmail,
    issue.reporterPhoto || "",
    issue.note || "",
    issue.timestamp
  ];
};

export const getFirstSheetTitleAndId = async (accessToken: string): Promise<{ title: string; id: number }> => {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch spreadsheet metadata: ${res.statusText}`);
    }
    const data = await res.json();
    const firstSheet = data.sheets?.[0];
    if (!firstSheet) {
      return { title: "Sheet1", id: 0 };
    }
    return {
      title: firstSheet.properties.title || "Sheet1",
      id: firstSheet.properties.sheetId ?? 0
    };
  } catch (err) {
    console.error("Error fetching first sheet info:", err);
    return { title: "Sheet1", id: 0 };
  }
};

export const ensureHeaders = async (accessToken: string, sheetTitle: string): Promise<void> => {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetTitle}!A1:O1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!data.values || data.values.length === 0) {
      const headers = [
        "ID", "PhotoUrl", "Category", "Severity", "Description",
        "Address", "Latitude", "Longitude", "Status", "ReporterId",
        "ReporterName", "ReporterEmail", "ReporterPhoto", "Note", "Timestamp"
      ];
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetTitle}!A1:O1?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ values: [headers] })
      });
      console.log("Initialized Google Sheet headers successfully.");
    }
  } catch (err) {
    console.error("Error ensuring sheet headers:", err);
  }
};

export const getIssuesFromSheets = async (accessToken: string): Promise<CivicIssue[]> => {
  const { title } = await getFirstSheetTitleAndId(accessToken);
  await ensureHeaders(accessToken, title);

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${title}!A:O`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch issues from Google Sheets: ${res.statusText}`);
  }
  const data = await res.json();
  if (!data.values || data.values.length <= 1) {
    return [];
  }

  const rows = data.values.slice(1);
  return rows.map(rowToIssue).filter(issue => issue.id);
};

export const appendIssueToSheets = async (accessToken: string, issue: CivicIssue): Promise<void> => {
  const { title } = await getFirstSheetTitleAndId(accessToken);
  await ensureHeaders(accessToken, title);

  const row = issueToRow(issue);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${title}!A:O:append?valueInputOption=USER_ENTERED`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ values: [row] })
  });
  if (!res.ok) {
    throw new Error(`Failed to append issue to Google Sheets: ${res.statusText}`);
  }
};

export const updateIssueInSheets = async (accessToken: string, id: string, updatedFields: Partial<CivicIssue>): Promise<void> => {
  const { title } = await getFirstSheetTitleAndId(accessToken);
  
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${title}!A:O`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet for update: ${res.statusText}`);
  }
  const data = await res.json();
  if (!data.values) {
    throw new Error("No values found in sheet for update.");
  }

  const rowIndex = data.values.findIndex((row: any[]) => row[0] === id);
  if (rowIndex === -1) {
    throw new Error(`Issue with ID ${id} not found in Google Sheets.`);
  }

  const sheetRowNumber = rowIndex + 1;
  const existingIssue = rowToIssue(data.values[rowIndex]);
  const updatedIssue = { ...existingIssue, ...updatedFields };
  const updatedRow = issueToRow(updatedIssue);

  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${title}!A${sheetRowNumber}:O${sheetRowNumber}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ values: [updatedRow] })
  });

  if (!updateRes.ok) {
    throw new Error(`Failed to update row in Google Sheets: ${updateRes.statusText}`);
  }
};

export const deleteIssueFromSheets = async (accessToken: string, id: string): Promise<void> => {
  const { title, id: sheetId } = await getFirstSheetTitleAndId(accessToken);
  
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${title}!A:O`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet for delete: ${res.statusText}`);
  }
  const data = await res.json();
  if (!data.values) {
    throw new Error("No values found in sheet for delete.");
  }

  const rowIndex = data.values.findIndex((row: any[]) => row[0] === id);
  if (rowIndex === -1) {
    throw new Error(`Issue with ID ${id} not found in Google Sheets.`);
  }

  const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }
      ]
    })
  });

  if (!batchRes.ok) {
    throw new Error(`Failed to delete row from Google Sheets: ${batchRes.statusText}`);
  }
};
