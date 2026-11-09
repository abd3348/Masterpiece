/* Current MasterDB application schema. Single source for all five views.
   Captured from read-only SQL Server catalogs; open database.html directly. */
'use strict';
globalThis.DatabaseDesign = Object.freeze({
  "project": {
    "name": "Campus Mate",
    "database": "MasterDB",
    "engine": "SQL Server",
    "schema": "dbo",
    "description": "Campus Mate connects tenants, landlords and potential roommates to find housing and agree rentals. It stores shared rental invitations, each tenant’s agreement consent, property reviews and room offers, while publishing fees remain separate from rent paid directly to the landlord.",
    "stores": [
      "User accounts",
      "Property listings",
      "Rental agreements",
      "Room offers",
      "Publishing fees",
      "Video meetings",
      "Reviews and reports"
    ],
    "hubTable": "Users",
    "source": "Read-only SQL Server catalog export from the existing MasterDB; checked against EF Core migrations.",
    "statusExplanation": "These are stored database values and their product meanings. Deadline expiry and temporary account restrictions can also be computed by the server. A status CHECK restricts allowed values; the application enforces transitions, roles and individual consent.",
    "snapshotDate": "2026-11-06",
    "excludedTables": [
      "__EFMigrationsHistory",
      "sysdiagrams"
    ]
  },
  "groups": [
    {
      "id": "identity",
      "name": "Accounts & preferences"
    },
    {
      "id": "catalog",
      "name": "Property catalog"
    },
    {
      "id": "rentals",
      "name": "Rental lifecycle"
    },
    {
      "id": "sharing",
      "name": "Room sharing"
    },
    {
      "id": "billing",
      "name": "Publishing fees"
    },
    {
      "id": "community",
      "name": "Video meetings"
    },
    {
      "id": "moderation",
      "name": "Trust & activity"
    }
  ],
  "tables": [
    {
      "name": "Activity",
      "group": "moderation",
      "description": "Audit activity and administrator-visible support requests.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "ActorId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": true
        },
        {
          "name": "Text",
          "type": "nvarchar(2000)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__Activity__Create__10216507"
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__Activity__3214EC07838C8452",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [],
      "indexes": [],
      "statusMappings": []
    },
    {
      "name": "ConditionReports",
      "group": "rentals",
      "description": "Initial and final condition records for a rental.",
      "columns": [
        {
          "name": "RentalId",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "Phase",
          "type": "varchar(10)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false,
          "enum": [
            "initial",
            "final"
          ]
        },
        {
          "name": "SubmittedBy",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "VideoId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": true
        },
        {
          "name": "ItemsJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Notes",
          "type": "nvarchar(4000)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "RecordedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__Condition__Recor__3A4CA8FD"
        }
      ],
      "primaryKey": [
        "RentalId",
        "Phase"
      ],
      "primaryKeyName": "PK__Conditio__42D1B081FFEF8208",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false,
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__Condition__Items__395884C4",
          "expression": "(isjson([ItemsJson])=(1))",
          "description": "ItemsJson must contain valid JSON."
        },
        {
          "name": "CK__Condition__Phase__367C1819",
          "expression": "([Phase]='final' OR [Phase]='initial')",
          "description": "Phase permits only final, initial."
        }
      ],
      "indexes": [],
      "statusMappings": [
        {
          "column": "Phase",
          "values": {
            "initial": "Move-in report",
            "final": "Move-out report"
          }
        }
      ]
    },
    {
      "name": "Favorites",
      "group": "catalog",
      "description": "Properties saved by each tenant.",
      "columns": [
        {
          "name": "UserId",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "PropertyId",
          "type": "int",
          "pk": true,
          "fk": true,
          "uq": false,
          "null": false
        }
      ],
      "primaryKey": [
        "UserId",
        "PropertyId"
      ],
      "primaryKeyName": "PK__Favorite__5084563FFB4C6FCD",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false,
        false
      ],
      "uniqueConstraints": [],
      "checks": [],
      "indexes": [],
      "statusMappings": []
    },
    {
      "name": "Inspections",
      "group": "rentals",
      "description": "The pre-arrangement property inspection checklist.",
      "columns": [
        {
          "name": "RequestId",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "ItemsJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Notes",
          "type": "nvarchar(4000)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__Inspectio__Creat__29221CFB"
        }
      ],
      "primaryKey": [
        "RequestId"
      ],
      "primaryKeyName": "PK__Inspecti__33A8517AD79D29BB",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__Inspectio__Items__282DF8C2",
          "expression": "(isjson([ItemsJson])=(1))",
          "description": "ItemsJson must contain valid JSON."
        }
      ],
      "indexes": [],
      "statusMappings": []
    },
    {
      "name": "ListingFees",
      "group": "billing",
      "description": "Property or room publishing fees, never tenant rent payments.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "PropertyId",
          "type": "int",
          "pk": false,
          "fk": true,
          "uq": true,
          "null": true
        },
        {
          "name": "PartialOfferId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": true,
          "null": true
        },
        {
          "name": "Amount",
          "type": "decimal(12,3)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Currency",
          "type": "char(3)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "('JOD')",
          "defaultName": "DF__ListingFe__Curre__51300E55",
          "enum": [
            "JOD"
          ]
        },
        {
          "name": "Status",
          "type": "varchar(10)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "('unpaid')",
          "defaultName": "DF__ListingFe__Statu__531856C7",
          "enum": [
            "unpaid",
            "paid"
          ]
        },
        {
          "name": "Provider",
          "type": "varchar(50)",
          "pk": false,
          "fk": false,
          "uq": true,
          "null": true
        },
        {
          "name": "ProviderPaymentId",
          "type": "nvarchar(200)",
          "pk": false,
          "fk": false,
          "uq": true,
          "null": true
        },
        {
          "name": "PaidAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Simulated",
          "type": "bit",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "((0))",
          "defaultName": "DF__ListingFe__Simul__55009F39"
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__ListingF__3214EC074B1B3B79",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__ListingFe__Curre__5224328E",
          "expression": "([Currency]='JOD')",
          "description": "Currency permits only JOD."
        },
        {
          "name": "CK__ListingFe__Statu__540C7B00",
          "expression": "([Status]='paid' OR [Status]='unpaid')",
          "description": "Status permits only paid, unpaid."
        },
        {
          "name": "CK__ListingFees__55F4C372",
          "expression": "([PropertyId] IS NOT NULL AND [PartialOfferId] IS NULL AND [Amount]=(20) OR [PropertyId] IS NULL AND [PartialOfferId] IS NOT NULL AND [Amount]=(5))",
          "description": "A fee belongs to exactly one property (JOD 20) or one room offer (JOD 5)."
        },
        {
          "name": "CK__ListingFees__56E8E7AB",
          "expression": "([Status]='paid' AND [PaidAt] IS NOT NULL OR [Status]='unpaid' AND [PaidAt] IS NULL)",
          "description": "A paid fee has a payment timestamp; an unpaid fee has none."
        }
      ],
      "indexes": [
        {
          "name": "UX_ListingFees_Property",
          "columns": [
            "PropertyId"
          ],
          "descending": [
            false
          ],
          "clustered": false,
          "unique": true,
          "where": "([PropertyId] IS NOT NULL)"
        },
        {
          "name": "UX_ListingFees_Partial",
          "columns": [
            "PartialOfferId"
          ],
          "descending": [
            false
          ],
          "clustered": false,
          "unique": true,
          "where": "([PartialOfferId] IS NOT NULL)"
        },
        {
          "name": "UX_ListingFees_ProviderPayment",
          "columns": [
            "Provider",
            "ProviderPaymentId"
          ],
          "descending": [
            false,
            false
          ],
          "clustered": false,
          "unique": true,
          "where": "([ProviderPaymentId] IS NOT NULL)"
        }
      ],
      "statusMappings": [
        {
          "column": "Status",
          "values": {
            "unpaid": "Publishing fee due",
            "paid": "Publishing fee confirmed"
          }
        }
      ]
    },
    {
      "name": "Media",
      "group": "catalog",
      "description": "Uploaded image and video metadata and storage keys.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "UploadedBy",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "Name",
          "type": "nvarchar(255)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "StorageKey",
          "type": "nvarchar(500)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "ContentType",
          "type": "varchar(100)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "SizeBytes",
          "type": "bigint",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__Media__CreatedAt__6A30C649"
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__Media__3214EC07606AA2C1",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__Media__SizeBytes__693CA210",
          "expression": "([SizeBytes]>(0))",
          "description": "SizeBytes must be greater than 0."
        }
      ],
      "indexes": [],
      "statusMappings": []
    },
    {
      "name": "Meetings",
      "group": "community",
      "description": "Video invitations between two users with scheduled times.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Kind",
          "type": "varchar(10)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "enum": [
            "property",
            "roommate",
            "sublet"
          ]
        },
        {
          "name": "PropertyId",
          "type": "int",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": true
        },
        {
          "name": "RoommateId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": true
        },
        {
          "name": "PartialRequestId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": true
        },
        {
          "name": "CreatorId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "RecipientId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "Title",
          "type": "nvarchar(200)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "StartsAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Duration",
          "type": "int",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "enum": [
            15,
            30,
            60
          ]
        },
        {
          "name": "Status",
          "type": "varchar(12)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "('pending')",
          "defaultName": "DF__Meetings__Status__6442E2C9",
          "enum": [
            "pending",
            "accepted",
            "declined",
            "cancelled"
          ]
        },
        {
          "name": "RoomName",
          "type": "nvarchar(200)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__Meetings__Create__662B2B3B"
        },
        {
          "name": "Version",
          "type": "rowversion",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__Meetings__3214EC073A5B8DDF",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__Meetings__671F4F74",
          "expression": "([CreatorId]<>[RecipientId])",
          "description": "CreatorId must be different from RecipientId."
        },
        {
          "name": "CK__Meetings__681373AD",
          "expression": "([Kind]='property' AND [PropertyId] IS NOT NULL AND [RoommateId] IS NULL AND [PartialRequestId] IS NULL OR [Kind]='roommate' AND [PropertyId] IS NULL AND [RoommateId] IS NOT NULL AND [PartialRequestId] IS NULL OR [Kind]='sublet' AND [PropertyId] IS NULL AND [RoommateId] IS NULL AND [PartialRequestId] IS NOT NULL)",
          "description": "The meeting kind matches exactly one subject: a property, roommate profile or room application."
        },
        {
          "name": "CK__Meetings__Durati__634EBE90",
          "expression": "([Duration]=(60) OR [Duration]=(30) OR [Duration]=(15))",
          "description": "Duration permits only 60, 30, 15."
        },
        {
          "name": "CK__Meetings__Kind__5D95E53A",
          "expression": "([Kind]='sublet' OR [Kind]='roommate' OR [Kind]='property')",
          "description": "Kind permits only sublet, roommate, property."
        },
        {
          "name": "CK__Meetings__Status__65370702",
          "expression": "([Status]='cancelled' OR [Status]='declined' OR [Status]='accepted' OR [Status]='pending')",
          "description": "Status permits only cancelled, declined, accepted, pending."
        }
      ],
      "indexes": [
        {
          "name": "IX_Meetings_Creator",
          "columns": [
            "CreatorId",
            "Status",
            "StartsAt"
          ],
          "descending": [
            false,
            false,
            false
          ],
          "clustered": false,
          "unique": false
        },
        {
          "name": "IX_Meetings_Recipient",
          "columns": [
            "RecipientId",
            "Status",
            "StartsAt"
          ],
          "descending": [
            false,
            false,
            false
          ],
          "clustered": false,
          "unique": false
        }
      ],
      "statusMappings": [
        {
          "column": "Status",
          "values": {
            "pending": "Awaiting recipient",
            "accepted": "Meeting confirmed",
            "declined": "Declined",
            "cancelled": "Cancelled"
          }
        }
      ]
    },
    {
      "name": "ModerationHistory",
      "group": "moderation",
      "description": "Administrative decisions and correction instructions.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "PropertyId",
          "type": "int",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "ReviewedBy",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "Decision",
          "type": "nvarchar(50)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Reason",
          "type": "nvarchar(1000)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Notes",
          "type": "nvarchar(4000)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "ReviewedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__Moderatio__Revie__0697FACD"
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__Moderati__3214EC0799CB4481",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [],
      "indexes": [],
      "statusMappings": []
    },
    {
      "name": "Notifications",
      "group": "moderation",
      "description": "User notifications and whether they have been read.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "RecipientId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "PropertyId",
          "type": "int",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": true
        },
        {
          "name": "PropertyTitle",
          "type": "nvarchar(200)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Type",
          "type": "varchar(50)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Text",
          "type": "nvarchar(2000)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "IsRead",
          "type": "bit",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "((0))",
          "defaultName": "DF__Notificat__IsRea__0B5CAFEA"
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__Notificat__Creat__0C50D423"
        },
        {
          "name": "Route",
          "type": "nvarchar(300)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__Notifica__3214EC07406A9A08",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [],
      "indexes": [
        {
          "name": "IX_Notifications_Inbox",
          "columns": [
            "RecipientId",
            "IsRead",
            "CreatedAt"
          ],
          "descending": [
            false,
            false,
            false
          ],
          "clustered": false,
          "unique": false
        }
      ],
      "statusMappings": []
    },
    {
      "name": "PartialOffers",
      "group": "sharing",
      "description": "Short-term room offers inside an existing rental.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "RentalId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "RoomNumber",
          "type": "int",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Occupancy",
          "type": "varchar(10)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "enum": [
            "private",
            "shared"
          ]
        },
        {
          "name": "StartDate",
          "type": "date",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "EndDate",
          "type": "date",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Price",
          "type": "decimal(12,3)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Notes",
          "type": "nvarchar(500)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Status",
          "type": "varchar(20)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "('awaiting-fee')",
          "defaultName": "DF__PartialOf__Statu__40F9A68C",
          "enum": [
            "awaiting-fee",
            "published",
            "archived",
            "deleted"
          ]
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__PartialOf__Creat__42E1EEFE"
        },
        {
          "name": "Version",
          "type": "rowversion",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__PartialO__3214EC0788C9D097",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__PartialOf__Occup__3F115E1A",
          "expression": "([Occupancy]='shared' OR [Occupancy]='private')",
          "description": "Occupancy permits only shared, private."
        },
        {
          "name": "CK__PartialOf__Price__40058253",
          "expression": "([Price]>(0))",
          "description": "Price must be greater than 0."
        },
        {
          "name": "CK__PartialOf__RoomN__3E1D39E1",
          "expression": "([RoomNumber]>(0))",
          "description": "RoomNumber must be greater than 0."
        },
        {
          "name": "CK__PartialOf__Statu__41EDCAC5",
          "expression": "([Status]='deleted' OR [Status]='archived' OR [Status]='published' OR [Status]='awaiting-fee')",
          "description": "Status permits only deleted, archived, published, awaiting-fee."
        },
        {
          "name": "CK__PartialOffers__43D61337",
          "expression": "(datediff(day,[StartDate],[EndDate])>=(1) AND datediff(day,[StartDate],[EndDate])<=(30))",
          "description": "A partial-room offer lasts between 1 and 30 days."
        }
      ],
      "indexes": [
        {
          "name": "IX_PartialOffers_Availability",
          "columns": [
            "RentalId",
            "RoomNumber",
            "Status",
            "StartDate",
            "EndDate"
          ],
          "descending": [
            false,
            false,
            false,
            false,
            false
          ],
          "clustered": false,
          "unique": false
        }
      ],
      "statusMappings": [
        {
          "column": "Status",
          "values": {
            "awaiting-fee": "Publishing fee due · JOD 5",
            "published": "Published room offer",
            "archived": "Paused",
            "deleted": "Removed"
          }
        }
      ]
    },
    {
      "name": "PartialRequests",
      "group": "sharing",
      "description": "Applications to rent a room from the current tenant.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "ListingId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "TenantId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "StartDate",
          "type": "date",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "EndDate",
          "type": "date",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Status",
          "type": "varchar(12)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "('pending')",
          "defaultName": "DF__PartialRe__Statu__489AC854",
          "enum": [
            "pending",
            "approved",
            "rejected"
          ]
        },
        {
          "name": "OfferSnapshotJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__PartialRe__Creat__4B7734FF"
        },
        {
          "name": "Version",
          "type": "rowversion",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__PartialR__3214EC07D1A8E644",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__PartialRe__Offer__4A8310C6",
          "expression": "(isjson([OfferSnapshotJson])=(1))",
          "description": "OfferSnapshotJson must contain valid JSON."
        },
        {
          "name": "CK__PartialRe__Statu__498EEC8D",
          "expression": "([Status]='rejected' OR [Status]='approved' OR [Status]='pending')",
          "description": "Status permits only rejected, approved, pending."
        },
        {
          "name": "CK__PartialRequests__4C6B5938",
          "expression": "([EndDate]>[StartDate])",
          "description": "EndDate must be greater than StartDate."
        }
      ],
      "indexes": [
        {
          "name": "IX_PartialRequests_Availability",
          "columns": [
            "ListingId",
            "Status",
            "StartDate",
            "EndDate"
          ],
          "descending": [
            false,
            false,
            false,
            false
          ],
          "clustered": false,
          "unique": false
        }
      ],
      "statusMappings": [
        {
          "column": "Status",
          "values": {
            "pending": "Awaiting current tenant",
            "approved": "Accepted",
            "rejected": "Declined"
          }
        }
      ]
    },
    {
      "name": "PaymentEvents",
      "group": "billing",
      "description": "Provider events recorded once to prevent repeated processing.",
      "columns": [
        {
          "name": "Provider",
          "type": "varchar(50)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "EventId",
          "type": "nvarchar(200)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "FeeId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "ProcessedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__PaymentEv__Proce__5AB9788F"
        }
      ],
      "primaryKey": [
        "Provider",
        "EventId"
      ],
      "primaryKeyName": "PK__PaymentE__8ED02D8BFB5D3DB4",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false,
        false
      ],
      "uniqueConstraints": [],
      "checks": [],
      "indexes": [],
      "statusMappings": []
    },
    {
      "name": "Preferences",
      "group": "identity",
      "description": "Housing budgets, locations and lifestyle preferences.",
      "columns": [
        {
          "name": "UserId",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "MinBudget",
          "type": "decimal(12,3)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "MaxBudget",
          "type": "decimal(12,3)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "AreasJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(N'[]')",
          "defaultName": "DF__Preferenc__Areas__52593CB8"
        },
        {
          "name": "Destination",
          "type": "nvarchar(200)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Commute",
          "type": "int",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Housing",
          "type": "nvarchar(50)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Furnishing",
          "type": "nvarchar(50)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Billing",
          "type": "varchar(10)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true,
          "enum": [
            "Monthly",
            "Daily"
          ]
        },
        {
          "name": "Roommates",
          "type": "bit",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "((0))",
          "defaultName": "DF__Preferenc__Roomm__5629CD9C"
        },
        {
          "name": "Sleep",
          "type": "nvarchar(50)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Schedule",
          "type": "nvarchar(50)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Noise",
          "type": "tinyint",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Cleanliness",
          "type": "tinyint",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Smoking",
          "type": "nvarchar(50)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "HabitsJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(N'[]')",
          "defaultName": "DF__Preferenc__Habit__59063A47"
        },
        {
          "name": "RoommatesCount",
          "type": "varchar(3)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "('0')",
          "defaultName": "DF_Preferences_RoommatesCount",
          "enum": [
            "0",
            "1",
            "2",
            "3+"
          ]
        }
      ],
      "primaryKey": [
        "UserId"
      ],
      "primaryKeyName": "PK__Preferen__1788CC4C165A8C91",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__Preferenc__Areas__534D60F1",
          "expression": "(isjson([AreasJson])=(1))",
          "description": "AreasJson must contain valid JSON."
        },
        {
          "name": "CK__Preferenc__Billi__5535A963",
          "expression": "([Billing]='Daily' OR [Billing]='Monthly')",
          "description": "Billing permits only Daily, Monthly."
        },
        {
          "name": "CK__Preferenc__Clean__5812160E",
          "expression": "([Cleanliness]>=(1) AND [Cleanliness]<=(5))",
          "description": "Cleanliness must be between 1 and 5."
        },
        {
          "name": "CK__Preferenc__Commu__5441852A",
          "expression": "([Commute]>=(0))",
          "description": "Commute must be at least 0."
        },
        {
          "name": "CK__Preferenc__Habit__59FA5E80",
          "expression": "(isjson([HabitsJson])=(1))",
          "description": "HabitsJson must contain valid JSON."
        },
        {
          "name": "CK__Preferenc__MinBu__5165187F",
          "expression": "([MinBudget]>=(0))",
          "description": "MinBudget must be at least 0."
        },
        {
          "name": "CK__Preferenc__Noise__571DF1D5",
          "expression": "([Noise]>=(1) AND [Noise]<=(5))",
          "description": "Noise must be between 1 and 5."
        },
        {
          "name": "CK__Preferences__5AEE82B9",
          "expression": "([MaxBudget]>=[MinBudget])",
          "description": "MaxBudget must be at least MinBudget."
        },
        {
          "name": "CK_Preferences_RoommatesCount",
          "expression": "([RoommatesCount]='3+' OR [RoommatesCount]='2' OR [RoommatesCount]='1' OR [RoommatesCount]='0')",
          "description": "RoommatesCount permits only 3+, 2, 1, 0."
        }
      ],
      "indexes": [],
      "statusMappings": []
    },
    {
      "name": "Properties",
      "group": "catalog",
      "description": "Landlord property advertisements and asking prices.",
      "columns": [
        {
          "name": "Id",
          "type": "int",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false,
          "identity": true,
          "identitySeed": 1,
          "identityIncrement": 1
        },
        {
          "name": "OwnerId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "Title",
          "type": "nvarchar(200)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "City",
          "type": "nvarchar(100)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Area",
          "type": "nvarchar(100)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Price",
          "type": "decimal(12,3)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Period",
          "type": "varchar(10)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "enum": [
            "Monthly",
            "Daily"
          ]
        },
        {
          "name": "Beds",
          "type": "int",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Baths",
          "type": "int",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Size",
          "type": "decimal(10,2)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Type",
          "type": "nvarchar(50)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Furnished",
          "type": "nvarchar(50)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Status",
          "type": "varchar(20)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "('awaiting-fee')",
          "defaultName": "DF__Propertie__Statu__72C60C4A",
          "enum": [
            "awaiting-fee",
            "pending",
            "published",
            "archived",
            "deleted"
          ]
        },
        {
          "name": "Description",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "AmenitiesJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(N'[]')",
          "defaultName": "DF__Propertie__Ameni__74AE54BC"
        },
        {
          "name": "AvailableFrom",
          "type": "date",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "AvailableTo",
          "type": "date",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Commute",
          "type": "int",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Noise",
          "type": "tinyint",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Cleanliness",
          "type": "tinyint",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Smoking",
          "type": "nvarchar(50)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Risk",
          "type": "tinyint",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "RiskReasonsJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "ModerationAnalysisJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__Propertie__Creat__7C4F7684"
        },
        {
          "name": "Version",
          "type": "rowversion",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "OwnerWantsPublished",
          "type": "bit",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(CONVERT([bit],(1)))",
          "defaultName": "DF__Propertie__Owner__22401542"
        },
        {
          "name": "ReviewStatus",
          "type": "varchar(20)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "('approved')",
          "defaultName": "DF__Propertie__Revie__2334397B",
          "enum": [
            "suspended",
            "changes-requested",
            "pending",
            "approved"
          ]
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__Properti__3214EC07292E5D39",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__Propertie__Ameni__75A278F5",
          "expression": "(isjson([AmenitiesJson])=(1))",
          "description": "AmenitiesJson must contain valid JSON."
        },
        {
          "name": "CK__Propertie__Baths__70DDC3D8",
          "expression": "([Baths]>=(0))",
          "description": "Baths must be at least 0."
        },
        {
          "name": "CK__Propertie__Clean__787EE5A0",
          "expression": "([Cleanliness]>=(1) AND [Cleanliness]<=(5))",
          "description": "Cleanliness must be between 1 and 5."
        },
        {
          "name": "CK__Propertie__Commu__76969D2E",
          "expression": "([Commute]>=(0))",
          "description": "Commute must be at least 0."
        },
        {
          "name": "CK__Propertie__Moder__7B5B524B",
          "expression": "([ModerationAnalysisJson] IS NULL OR isjson([ModerationAnalysisJson])=(1))",
          "description": "ModerationAnalysisJson may be empty; otherwise it must contain valid JSON."
        },
        {
          "name": "CK__Propertie__Noise__778AC167",
          "expression": "([Noise]>=(1) AND [Noise]<=(5))",
          "description": "Noise must be between 1 and 5."
        },
        {
          "name": "CK__Propertie__Perio__6EF57B66",
          "expression": "([Period]='Daily' OR [Period]='Monthly')",
          "description": "Period permits only Daily, Monthly."
        },
        {
          "name": "CK__Propertie__Price__6E01572D",
          "expression": "([Price]>(0))",
          "description": "Price must be greater than 0."
        },
        {
          "name": "CK__Propertie__RiskR__7A672E12",
          "expression": "([RiskReasonsJson] IS NULL OR isjson([RiskReasonsJson])=(1))",
          "description": "RiskReasonsJson may be empty; otherwise it must contain valid JSON."
        },
        {
          "name": "CK__Propertie__Statu__73BA3083",
          "expression": "([Status]='deleted' OR [Status]='archived' OR [Status]='published' OR [Status]='pending' OR [Status]='awaiting-fee')",
          "description": "Status permits only deleted, archived, published, pending, awaiting-fee."
        },
        {
          "name": "CK__Properties__7D439ABD",
          "expression": "([AvailableTo]>[AvailableFrom])",
          "description": "AvailableTo must be greater than AvailableFrom."
        },
        {
          "name": "CK__Properties__Beds__6FE99F9F",
          "expression": "([Beds]>(0))",
          "description": "Beds must be greater than 0."
        },
        {
          "name": "CK__Properties__Risk__797309D9",
          "expression": "([Risk]>=(0) AND [Risk]<=(100))",
          "description": "Risk must be between 0 and 100."
        },
        {
          "name": "CK__Properties__Size__71D1E811",
          "expression": "([Size]>(0))",
          "description": "Size must be greater than 0."
        },
        {
          "name": "CK_Properties_ReviewStatus",
          "expression": "([ReviewStatus]='suspended' OR [ReviewStatus]='changes-requested' OR [ReviewStatus]='pending' OR [ReviewStatus]='approved')",
          "description": "ReviewStatus permits only suspended, changes-requested, pending, approved."
        }
      ],
      "indexes": [
        {
          "name": "IX_Properties_Search",
          "columns": [
            "Status",
            "City",
            "Area",
            "Price"
          ],
          "descending": [
            false,
            false,
            false,
            false
          ],
          "clustered": false,
          "unique": false
        },
        {
          "name": "IX_Properties_Owner",
          "columns": [
            "OwnerId"
          ],
          "descending": [
            false
          ],
          "clustered": false,
          "unique": false
        }
      ],
      "statusMappings": [
        {
          "column": "Status",
          "values": {
            "awaiting-fee": "Listing fee due · JOD 20",
            "pending": "Administrator review",
            "published": "Published",
            "archived": "Paused",
            "deleted": "Removed"
          }
        },
        {
          "column": "ReviewStatus",
          "values": {
            "suspended": "Hidden following a serious moderation decision.",
            "changes-requested": "Hidden; owner must correct and resubmit the same advertisement.",
            "pending": "Awaiting admin review.",
            "approved": "Review approved; publication still depends on the owner’s preference and paid fee."
          }
        }
      ]
    },
    {
      "name": "PropertyMedia",
      "group": "catalog",
      "description": "Photos and the optional video attached to a property.",
      "columns": [
        {
          "name": "PropertyId",
          "type": "int",
          "pk": true,
          "fk": true,
          "uq": true,
          "null": false
        },
        {
          "name": "MediaId",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "Kind",
          "type": "varchar(10)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "enum": [
            "photo",
            "video"
          ]
        },
        {
          "name": "SortOrder",
          "type": "int",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "((0))",
          "defaultName": "DF__PropertyM__SortO__02FC7413"
        }
      ],
      "primaryKey": [
        "PropertyId",
        "MediaId"
      ],
      "primaryKeyName": "PK__Property__9BE58C69C4AA6747",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false,
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__PropertyM__SortO__03F0984C",
          "expression": "([SortOrder]>=(0))",
          "description": "SortOrder must be at least 0."
        },
        {
          "name": "CK__PropertyMe__Kind__02084FDA",
          "expression": "([Kind]='video' OR [Kind]='photo')",
          "description": "Kind permits only video, photo."
        }
      ],
      "indexes": [
        {
          "name": "UX_PropertyMedia_Video",
          "columns": [
            "PropertyId"
          ],
          "descending": [
            false
          ],
          "clustered": false,
          "unique": true,
          "where": "([Kind]='video')"
        }
      ],
      "statusMappings": []
    },
    {
      "name": "RentalAmendments",
      "group": "rentals",
      "description": "Immutable proposed changes to confirmed rentals, with original terms and individual approval records.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "RentalId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "ProposedBy",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "BaseTermsVersion",
          "type": "int",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "OriginalTermsJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "ProposedTermsJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "RequiredApproversJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "ApprovedByJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Status",
          "type": "varchar(16)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "enum": [
            "cancelled",
            "rejected",
            "approved",
            "pending"
          ]
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK_RentalAmendments",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK_RentalAmendments_Status",
          "expression": "([Status]='cancelled' OR [Status]='rejected' OR [Status]='approved' OR [Status]='pending')",
          "description": "Status permits only cancelled, rejected, approved, pending."
        }
      ],
      "indexes": [],
      "statusMappings": [
        {
          "column": "Status",
          "values": {
            "cancelled": "Superseded by another amendment, or the rental closed.",
            "rejected": "A participant rejected or withdrew; existing terms stay effective.",
            "approved": "All affected participants accepted; revised terms applied as a new version.",
            "pending": "Current rental unchanged; waiting for every affected participant."
          }
        }
      ]
    },
    {
      "name": "RentalRequests",
      "group": "rentals",
      "description": "Rental applications, negotiated prices and snapshots of agreed terms.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "PropertyId",
          "type": "int",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "TenantId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "RoommateId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": true
        },
        {
          "name": "Message",
          "type": "nvarchar(2000)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "StartDate",
          "type": "date",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "EndDate",
          "type": "date",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Duration",
          "type": "int",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Period",
          "type": "varchar(10)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "enum": [
            "Monthly",
            "Daily"
          ]
        },
        {
          "name": "Status",
          "type": "varchar(16)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "('submitted')",
          "defaultName": "DF__RentalReq__Statu__151B244E",
          "enum": [
            "submitted",
            "approved",
            "inspection",
            "payment",
            "active",
            "closed",
            "rejected",
            "cancelled",
            "confirmed",
            "agreement",
            "waiting-roommate",
            "draft"
          ]
        },
        {
          "name": "PropertySnapshotJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "AgreedPrice",
          "type": "decimal(12,3)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Deposit",
          "type": "decimal(12,3)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Total",
          "type": "decimal(12,3)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "LandlordAccepted",
          "type": "bit",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "((0))",
          "defaultName": "DF__RentalReq__Landl__1AD3FDA4"
        },
        {
          "name": "TenantAccepted",
          "type": "bit",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "((0))",
          "defaultName": "DF__RentalReq__Tenan__1BC821DD"
        },
        {
          "name": "AgreementSnapshotJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__RentalReq__Creat__1DB06A4F"
        },
        {
          "name": "Version",
          "type": "rowversion",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "InvitationExpiresAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "InvitationStatus",
          "type": "varchar(16)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true,
          "enum": [
            "expired",
            "cancelled",
            "declined",
            "accepted",
            "pending"
          ]
        },
        {
          "name": "RoommateAccepted",
          "type": "bit",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(CONVERT([bit],(0)))",
          "defaultName": "DF__RentalReq__Roomm__1F63A897"
        },
        {
          "name": "RoommateUserId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": true
        },
        {
          "name": "TermsVersion",
          "type": "int",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "((1))",
          "defaultName": "DF__RentalReq__Terms__2057CCD0"
        },
        {
          "name": "WorkflowVersion",
          "type": "int",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "((1))",
          "defaultName": "DF__RentalReq__Workf__214BF109"
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__RentalRe__3214EC07D3D04F4D",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__RentalReq__Agree__17F790F9",
          "expression": "([AgreedPrice]>(0))",
          "description": "AgreedPrice must be greater than 0."
        },
        {
          "name": "CK__RentalReq__Agree__1CBC4616",
          "expression": "([AgreementSnapshotJson] IS NULL OR isjson([AgreementSnapshotJson])=(1))",
          "description": "AgreementSnapshotJson may be empty; otherwise it must contain valid JSON."
        },
        {
          "name": "CK__RentalReq__Depos__18EBB532",
          "expression": "([Deposit]>=(0))",
          "description": "Deposit must be at least 0."
        },
        {
          "name": "CK__RentalReq__Durat__1332DBDC",
          "expression": "([Duration]>(0))",
          "description": "Duration must be greater than 0."
        },
        {
          "name": "CK__RentalReq__Perio__14270015",
          "expression": "([Period]='Daily' OR [Period]='Monthly')",
          "description": "Period permits only Daily, Monthly."
        },
        {
          "name": "CK__RentalReq__Prope__17036CC0",
          "expression": "(isjson([PropertySnapshotJson])=(1))",
          "description": "PropertySnapshotJson must contain valid JSON."
        },
        {
          "name": "CK__RentalReq__Statu__160F4887",
          "expression": "([Status]='cancelled' OR [Status]='rejected' OR [Status]='closed' OR [Status]='active' OR [Status]='confirmed' OR [Status]='payment' OR [Status]='agreement' OR [Status]='inspection' OR [Status]='approved' OR [Status]='submitted' OR [Status]='waiting-roommate' OR [Status]='draft')",
          "description": "Status permits only cancelled, rejected, closed, active, confirmed, payment, agreement, inspection, approved, submitted, waiting-roommate, draft."
        },
        {
          "name": "CK__RentalReq__Total__19DFD96B",
          "expression": "([Total]>=(0))",
          "description": "Total must be at least 0."
        },
        {
          "name": "CK__RentalRequests__1EA48E88",
          "expression": "([EndDate]>[StartDate])",
          "description": "EndDate must be greater than StartDate."
        },
        {
          "name": "CK_RentalRequests_Invitation",
          "expression": "([InvitationStatus] IS NULL OR ([InvitationStatus]='expired' OR [InvitationStatus]='cancelled' OR [InvitationStatus]='declined' OR [InvitationStatus]='accepted' OR [InvitationStatus]='pending'))",
          "description": "InvitationStatus permits only expired, cancelled, declined, accepted, pending, or NULL."
        }
      ],
      "indexes": [
        {
          "name": "IX_Requests_Availability",
          "columns": [
            "PropertyId",
            "Status",
            "StartDate",
            "EndDate"
          ],
          "descending": [
            false,
            false,
            false,
            false
          ],
          "clustered": false,
          "unique": false
        },
        {
          "name": "IX_Requests_Tenant",
          "columns": [
            "TenantId",
            "CreatedAt"
          ],
          "descending": [
            false,
            false
          ],
          "clustered": false,
          "unique": false
        }
      ],
      "statusMappings": [
        {
          "column": "Status",
          "values": {
            "submitted": "Joint or solo application sent to the landlord.",
            "approved": "Older workflow: owner approved; review the agreement.",
            "inspection": "Owner approved; waiting for lead tenant inspection.",
            "payment": "All approvals complete; lead tenant confirms the direct arrangement, not collecting tenant rent.",
            "active": "Keys received; rental active.",
            "closed": "Rental closed.",
            "rejected": "Landlord declined the application.",
            "cancelled": "Application cancelled.",
            "confirmed": "Confirmed; waiting for key handover.",
            "agreement": "Each tenant must accept the same final agreement independently.",
            "waiting-roommate": "Waiting for the invited roommate; not yet sent to the landlord.",
            "draft": "Invitation declined, cancelled or expired; lead tenant chooses another roommate or applies alone."
          }
        },
        {
          "column": "InvitationStatus",
          "values": {
            "expired": "Invitation expired; also derived when a pending invitation passes its deadline.",
            "cancelled": "Lead tenant cancelled the invitation.",
            "declined": "Roommate declined; hidden from their current requests.",
            "accepted": "Roommate agreed to apply; final agreement acceptance remains separate.",
            "pending": "Invitation awaiting a response for up to 48 hours."
          }
        }
      ]
    },
    {
      "name": "Rentals",
      "group": "rentals",
      "description": "Confirmed direct rental arrangements and move-in state.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "RequestId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": true,
          "null": false
        },
        {
          "name": "Status",
          "type": "varchar(10)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "('active')",
          "defaultName": "DF__Rentals__Status__2DE6D218",
          "enum": [
            "active",
            "closed",
            "upcoming"
          ]
        },
        {
          "name": "EndDate",
          "type": "date",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "PaymentMethod",
          "type": "varchar(24)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "('direct-to-landlord')",
          "defaultName": "DF__Rentals__Payment__2FCF1A8A",
          "enum": [
            "direct-to-landlord"
          ]
        },
        {
          "name": "MoveInComplete",
          "type": "bit",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "((0))",
          "defaultName": "DF__Rentals__MoveInC__31B762FC"
        },
        {
          "name": "ArrangementConfirmedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__Rentals__Arrange__32AB8735"
        },
        {
          "name": "ClosedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Version",
          "type": "rowversion",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__Rentals__3214EC07F5B08839",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [
        {
          "name": "UQ__Rentals__33A8517BDD3147A3",
          "columns": [
            "RequestId"
          ],
          "descending": [
            false
          ],
          "clustered": false
        }
      ],
      "checks": [
        {
          "name": "CK__Rentals__Payment__30C33EC3",
          "expression": "([PaymentMethod]='direct-to-landlord')",
          "description": "PaymentMethod permits only direct-to-landlord."
        },
        {
          "name": "CK__Rentals__Status__2EDAF651",
          "expression": "([Status]='closed' OR [Status]='active' OR [Status]='upcoming')",
          "description": "Status permits only closed, active, upcoming."
        }
      ],
      "indexes": [],
      "statusMappings": [
        {
          "column": "Status",
          "values": {
            "active": "Key handover confirmed; active rental.",
            "closed": "Rental closed; reports retained.",
            "upcoming": "Confirmed; waiting for receipt of keys."
          }
        }
      ]
    },
    {
      "name": "RentNegotiations",
      "group": "rentals",
      "description": "Proposed rent prices and the landlord’s response.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "RequestId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": true,
          "null": false
        },
        {
          "name": "Price",
          "type": "decimal(12,3)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Status",
          "type": "varchar(12)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "enum": [
            "pending",
            "confirmed",
            "declined"
          ]
        },
        {
          "name": "ProposedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__RentNegot__Propo__245D67DE"
        },
        {
          "name": "ReviewedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__RentNego__3214EC070EE2713B",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__RentNegot__Price__22751F6C",
          "expression": "([Price]>(0))",
          "description": "Price must be greater than 0."
        },
        {
          "name": "CK__RentNegot__Statu__236943A5",
          "expression": "([Status]='declined' OR [Status]='confirmed' OR [Status]='pending')",
          "description": "Status permits only declined, confirmed, pending."
        }
      ],
      "indexes": [
        {
          "name": "UX_RentNegotiations_Pending",
          "columns": [
            "RequestId"
          ],
          "descending": [
            false
          ],
          "clustered": false,
          "unique": true,
          "where": "([Status]='pending')"
        }
      ],
      "statusMappings": [
        {
          "column": "Status",
          "values": {
            "pending": "Awaiting landlord confirmation",
            "confirmed": "Agreed price",
            "declined": "Declined"
          }
        }
      ]
    },
    {
      "name": "Reports",
      "group": "moderation",
      "description": "Property concerns filed by users and their resolution.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "PropertyId",
          "type": "int",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "ReporterId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "Reason",
          "type": "nvarchar(200)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Notes",
          "type": "nvarchar(4000)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Status",
          "type": "varchar(12)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "('open')",
          "defaultName": "DF__Reports__Status__7EF6D905",
          "enum": [
            "open",
            "resolved"
          ]
        },
        {
          "name": "Resolution",
          "type": "nvarchar(4000)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "ResolvedBy",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": true
        },
        {
          "name": "ResolvedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__Reports__Created__01D345B0"
        },
        {
          "name": "ActionTakenAt",
          "type": "datetimeoffset(7)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "ResolutionNotes",
          "type": "nvarchar(1000)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__Reports__3214EC077C35DAB8",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__Reports__Status__7FEAFD3E",
          "expression": "([Status]='resolved' OR [Status]='open')",
          "description": "Status permits only resolved, open."
        }
      ],
      "indexes": [],
      "statusMappings": [
        {
          "column": "Status",
          "values": {
            "open": "Needs review",
            "resolved": "Resolved"
          }
        }
      ]
    },
    {
      "name": "Reviews",
      "group": "catalog",
      "description": "User ratings and written property reviews.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "PropertyId",
          "type": "int",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "AuthorId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "Rating",
          "type": "tinyint",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Text",
          "type": "nvarchar(2000)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__Reviews__Created__0D7A0286"
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__Reviews__3214EC0722BD8AEC",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [],
      "checks": [
        {
          "name": "CK__Reviews__Rating__0C85DE4D",
          "expression": "([Rating]>=(1) AND [Rating]<=(5))",
          "description": "Rating must be between 1 and 5."
        }
      ],
      "indexes": [
        {
          "name": "IX_Reviews_Property",
          "columns": [
            "PropertyId"
          ],
          "descending": [
            false
          ],
          "clustered": false,
          "unique": false
        }
      ],
      "statusMappings": []
    },
    {
      "name": "RoommateContacts",
      "group": "identity",
      "description": "Requests to connect with a potential roommate.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "UserId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": true,
          "null": false
        },
        {
          "name": "PersonId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": true,
          "null": false
        },
        {
          "name": "Status",
          "type": "varchar(12)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "('pending')",
          "defaultName": "DF__RoommateC__Statu__6DCC4D03",
          "enum": [
            "pending",
            "accepted",
            "rejected"
          ]
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__RoommateC__Creat__6FB49575"
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__Roommate__3214EC07BA937107",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [
        {
          "name": "UQ__Roommate__5D2A33F3603424A6",
          "columns": [
            "UserId",
            "PersonId"
          ],
          "descending": [
            false,
            false
          ],
          "clustered": false
        }
      ],
      "checks": [
        {
          "name": "CK__RoommateC__Statu__6EC0713C",
          "expression": "([Status]='rejected' OR [Status]='accepted' OR [Status]='pending')",
          "description": "Status permits only rejected, accepted, pending."
        }
      ],
      "indexes": [],
      "statusMappings": [
        {
          "column": "Status",
          "values": {
            "pending": "Contact requested",
            "accepted": "Accepted",
            "rejected": "Declined"
          }
        }
      ]
    },
    {
      "name": "RoommateFavorites",
      "group": "identity",
      "description": "Saved roommate profiles per account; saving does not imply rental consent.",
      "columns": [
        {
          "name": "UserId",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": true,
          "uq": false,
          "null": false
        },
        {
          "name": "RoommateId",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": true,
          "uq": false,
          "null": false
        }
      ],
      "primaryKey": [
        "UserId",
        "RoommateId"
      ],
      "primaryKeyName": "PK_RoommateFavorites",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false,
        false
      ],
      "uniqueConstraints": [],
      "checks": [],
      "indexes": [],
      "statusMappings": []
    },
    {
      "name": "RoommateProfiles",
      "group": "identity",
      "description": "Public roommate profiles linked to real user accounts.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "UserId",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": true,
          "uq": true,
          "null": false
        },
        {
          "name": "Area",
          "type": "nvarchar(100)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "MinBudget",
          "type": "decimal(12,3)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "MaxBudget",
          "type": "decimal(12,3)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Sleep",
          "type": "nvarchar(50)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Schedule",
          "type": "nvarchar(50)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Noise",
          "type": "tinyint",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Cleanliness",
          "type": "tinyint",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Smoking",
          "type": "nvarchar(50)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "HabitsJson",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(N'[]')",
          "defaultName": "DF__RoommateP__Habit__628FA481"
        },
        {
          "name": "Available",
          "type": "bit",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "((1))",
          "defaultName": "DF__RoommateP__Avail__6477ECF3"
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__Roommate__3214EC07D313DD77",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [
        {
          "name": "UQ__Roommate__1788CC4D41B84DF9",
          "columns": [
            "UserId"
          ],
          "descending": [
            false
          ],
          "clustered": false
        }
      ],
      "checks": [
        {
          "name": "CK__RoommateP__Clean__619B8048",
          "expression": "([Cleanliness]>=(1) AND [Cleanliness]<=(5))",
          "description": "Cleanliness must be between 1 and 5."
        },
        {
          "name": "CK__RoommateP__Habit__6383C8BA",
          "expression": "(isjson([HabitsJson])=(1))",
          "description": "HabitsJson must contain valid JSON."
        },
        {
          "name": "CK__RoommateP__MinBu__5FB337D6",
          "expression": "([MinBudget]>=(0))",
          "description": "MinBudget must be at least 0."
        },
        {
          "name": "CK__RoommateP__Noise__60A75C0F",
          "expression": "([Noise]>=(1) AND [Noise]<=(5))",
          "description": "Noise must be between 1 and 5."
        },
        {
          "name": "CK__RoommateProfiles__656C112C",
          "expression": "([MaxBudget]>=[MinBudget])",
          "description": "MaxBudget must be at least MinBudget."
        }
      ],
      "indexes": [],
      "statusMappings": []
    },
    {
      "name": "Users",
      "group": "identity",
      "description": "Tenant, landlord and administrator accounts.",
      "columns": [
        {
          "name": "Id",
          "type": "nvarchar(64)",
          "pk": true,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Role",
          "type": "varchar(16)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "enum": [
            "tenant",
            "landlord",
            "admin"
          ]
        },
        {
          "name": "FirstName",
          "type": "nvarchar(100)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "LastName",
          "type": "nvarchar(100)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Email",
          "type": "nvarchar(254)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "NormalizedEmail",
          "type": "nvarchar(254)",
          "pk": false,
          "fk": false,
          "uq": true,
          "null": false
        },
        {
          "name": "PasswordHash",
          "type": "nvarchar(max)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "SecurityStamp",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Phone",
          "type": "nvarchar(32)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "City",
          "type": "nvarchar(100)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "Occupation",
          "type": "nvarchar(150)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Destination",
          "type": "nvarchar(200)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "Active",
          "type": "bit",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "((1))",
          "defaultName": "DF__Users__Active__4CA06362"
        },
        {
          "name": "CreatedAt",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false,
          "default": "(sysdatetimeoffset())",
          "defaultName": "DF__Users__CreatedAt__4D94879B"
        },
        {
          "name": "Version",
          "type": "rowversion",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": false
        },
        {
          "name": "SuspendedBy",
          "type": "nvarchar(64)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "SuspendedUntil",
          "type": "datetimeoffset(0)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        },
        {
          "name": "SuspensionReason",
          "type": "nvarchar(1000)",
          "pk": false,
          "fk": false,
          "uq": false,
          "null": true
        }
      ],
      "primaryKey": [
        "Id"
      ],
      "primaryKeyName": "PK__Users__3214EC070524A625",
      "primaryKeyClustered": true,
      "primaryKeyDescending": [
        false
      ],
      "uniqueConstraints": [
        {
          "name": "UQ__Users__368B291AC7FE6295",
          "columns": [
            "NormalizedEmail"
          ],
          "descending": [
            false
          ],
          "clustered": false
        }
      ],
      "checks": [
        {
          "name": "CK__Users__Role__4BAC3F29",
          "expression": "([Role]='admin' OR [Role]='landlord' OR [Role]='tenant')",
          "description": "Role permits only admin, landlord, tenant."
        }
      ],
      "indexes": [],
      "statusMappings": [
        {
          "column": "Role",
          "values": {
            "tenant": "Tenant",
            "landlord": "Property owner",
            "admin": "Administrator"
          }
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "rel-1",
      "name": "FK__Activity__ActorI__0F2D40CE",
      "from": "Activity",
      "column": "ActorId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "zeroOne",
      "label": "performed by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-2",
      "name": "FK__Condition__Renta__3587F3E0",
      "from": "ConditionReports",
      "column": "RentalId",
      "to": "Rentals",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "documents",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-3",
      "name": "FK__Condition__Submi__37703C52",
      "from": "ConditionReports",
      "column": "SubmittedBy",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "recorded by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-4",
      "name": "FK__Condition__Video__3864608B",
      "from": "ConditionReports",
      "column": "VideoId",
      "to": "Media",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "zeroOne",
      "label": "attaches",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-5",
      "name": "FK__Favorites__Prope__07C12930",
      "from": "Favorites",
      "column": "PropertyId",
      "to": "Properties",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "saves",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-6",
      "name": "FK__Favorites__UserI__06CD04F7",
      "from": "Favorites",
      "column": "UserId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "saved by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-7",
      "name": "FK__Inspectio__Reque__2739D489",
      "from": "Inspections",
      "column": "RequestId",
      "to": "RentalRequests",
      "toColumn": "Id",
      "fromCardinality": "zeroOne",
      "toCardinality": "one",
      "label": "inspects",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-8",
      "name": "FK__ListingFe__Parti__503BEA1C",
      "from": "ListingFees",
      "column": "PartialOfferId",
      "to": "PartialOffers",
      "toColumn": "Id",
      "fromCardinality": "zeroOne",
      "toCardinality": "zeroOne",
      "label": "publishes",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-9",
      "name": "FK__ListingFe__Prope__4F47C5E3",
      "from": "ListingFees",
      "column": "PropertyId",
      "to": "Properties",
      "toColumn": "Id",
      "fromCardinality": "zeroOne",
      "toCardinality": "zeroOne",
      "label": "publishes",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-10",
      "name": "FK__Media__UploadedB__68487DD7",
      "from": "Media",
      "column": "UploadedBy",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "uploaded by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-11",
      "name": "FK__Meetings__Creato__6166761E",
      "from": "Meetings",
      "column": "CreatorId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "created by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-12",
      "name": "FK__Meetings__Partia__607251E5",
      "from": "Meetings",
      "column": "PartialRequestId",
      "to": "PartialRequests",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "zeroOne",
      "label": "arranges",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-13",
      "name": "FK__Meetings__Proper__5E8A0973",
      "from": "Meetings",
      "column": "PropertyId",
      "to": "Properties",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "zeroOne",
      "label": "discusses",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-14",
      "name": "FK__Meetings__Recipi__625A9A57",
      "from": "Meetings",
      "column": "RecipientId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "invites",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-15",
      "name": "FK__Meetings__Roomma__5F7E2DAC",
      "from": "Meetings",
      "column": "RoommateId",
      "to": "RoommateProfiles",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "zeroOne",
      "label": "introduces",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-16",
      "name": "FK__Moderatio__Prope__04AFB25B",
      "from": "ModerationHistory",
      "column": "PropertyId",
      "to": "Properties",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "reviews",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-17",
      "name": "FK__Moderatio__Revie__05A3D694",
      "from": "ModerationHistory",
      "column": "ReviewedBy",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "reviewed by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-18",
      "name": "FK__Notificat__Prope__0A688BB1",
      "from": "Notifications",
      "column": "PropertyId",
      "to": "Properties",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "zeroOne",
      "label": "concerns",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-19",
      "name": "FK__Notificat__Recip__09746778",
      "from": "Notifications",
      "column": "RecipientId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "notifies",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-20",
      "name": "FK__PartialOf__Renta__3D2915A8",
      "from": "PartialOffers",
      "column": "RentalId",
      "to": "Rentals",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "offers part of",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-21",
      "name": "FK__PartialRe__Listi__46B27FE2",
      "from": "PartialRequests",
      "column": "ListingId",
      "to": "PartialOffers",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "applies to",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-22",
      "name": "FK__PartialRe__Tenan__47A6A41B",
      "from": "PartialRequests",
      "column": "TenantId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "requested by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-23",
      "name": "FK__PaymentEv__FeeId__59C55456",
      "from": "PaymentEvents",
      "column": "FeeId",
      "to": "ListingFees",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "confirms fee",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-24",
      "name": "FK__Preferenc__UserI__5070F446",
      "from": "Preferences",
      "column": "UserId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroOne",
      "toCardinality": "one",
      "label": "belongs to",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-25",
      "name": "FK__Propertie__Owner__6D0D32F4",
      "from": "Properties",
      "column": "OwnerId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "owned by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-26",
      "name": "FK__PropertyM__Media__01142BA1",
      "from": "PropertyMedia",
      "column": "MediaId",
      "to": "Media",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "attaches",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-27",
      "name": "FK__PropertyM__Prope__00200768",
      "from": "PropertyMedia",
      "column": "PropertyId",
      "to": "Properties",
      "toColumn": "Id",
      "fromCardinality": "zeroOne",
      "toCardinality": "one",
      "label": "illustrates",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-28",
      "name": "FK_RentalAmendments_Rentals_RentalId",
      "from": "RentalAmendments",
      "column": "RentalId",
      "to": "Rentals",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "amends",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-29",
      "name": "FK_RentalAmendments_Users_ProposedBy",
      "from": "RentalAmendments",
      "column": "ProposedBy",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "proposed by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-30",
      "name": "FK__RentalReq__Prope__10566F31",
      "from": "RentalRequests",
      "column": "PropertyId",
      "to": "Properties",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "requests",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-31",
      "name": "FK__RentalReq__Roomm__123EB7A3",
      "from": "RentalRequests",
      "column": "RoommateId",
      "to": "RoommateProfiles",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "zeroOne",
      "label": "shares with",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-32",
      "name": "FK__RentalReq__Tenan__114A936A",
      "from": "RentalRequests",
      "column": "TenantId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "submitted by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-33",
      "name": "FK_RentalRequests_Users_RoommateUserId",
      "from": "RentalRequests",
      "column": "RoommateUserId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "zeroOne",
      "label": "invites",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-34",
      "name": "FK__Rentals__Request__2CF2ADDF",
      "from": "Rentals",
      "column": "RequestId",
      "to": "RentalRequests",
      "toColumn": "Id",
      "fromCardinality": "zeroOne",
      "toCardinality": "one",
      "label": "confirms",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-35",
      "name": "FK__RentNegot__Reque__2180FB33",
      "from": "RentNegotiations",
      "column": "RequestId",
      "to": "RentalRequests",
      "toColumn": "Id",
      "fromCardinality": "zeroOne",
      "toCardinality": "one",
      "label": "negotiates",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-36",
      "name": "FK__Reports__Propert__7D0E9093",
      "from": "Reports",
      "column": "PropertyId",
      "to": "Properties",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "flags",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-37",
      "name": "FK__Reports__Reporte__7E02B4CC",
      "from": "Reports",
      "column": "ReporterId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "filed by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-38",
      "name": "FK__Reports__Resolve__00DF2177",
      "from": "Reports",
      "column": "ResolvedBy",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "zeroOne",
      "label": "resolved by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-39",
      "name": "FK__Reviews__AuthorI__0B91BA14",
      "from": "Reviews",
      "column": "AuthorId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "written by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-40",
      "name": "FK__Reviews__Propert__0A9D95DB",
      "from": "Reviews",
      "column": "PropertyId",
      "to": "Properties",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "rates",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-41",
      "name": "FK__RoommateC__Perso__6CD828CA",
      "from": "RoommateContacts",
      "column": "PersonId",
      "to": "RoommateProfiles",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "contacts",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-42",
      "name": "FK__RoommateC__UserI__6BE40491",
      "from": "RoommateContacts",
      "column": "UserId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "sent by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-43",
      "name": "FK_RoommateFavorites_RoommateProfiles_RoommateId",
      "from": "RoommateFavorites",
      "column": "RoommateId",
      "to": "RoommateProfiles",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "saves",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-44",
      "name": "FK_RoommateFavorites_Users_UserId",
      "from": "RoommateFavorites",
      "column": "UserId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroMany",
      "toCardinality": "one",
      "label": "saved by",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    },
    {
      "id": "rel-45",
      "name": "FK__RoommateP__UserI__5EBF139D",
      "from": "RoommateProfiles",
      "column": "UserId",
      "to": "Users",
      "toColumn": "Id",
      "fromCardinality": "zeroOne",
      "toCardinality": "one",
      "label": "profiles",
      "onDelete": "NO_ACTION",
      "onUpdate": "NO_ACTION"
    }
  ],
  "LAYOUT": [
    [
      "Users",
      "Preferences",
      "RoommateProfiles",
      "RoommateContacts",
      "RoommateFavorites"
    ],
    [
      "Properties",
      "Media",
      "PropertyMedia",
      "Favorites",
      "Reviews"
    ],
    [
      "RentalRequests",
      "RentNegotiations",
      "Inspections",
      "Rentals",
      "ConditionReports",
      "RentalAmendments"
    ],
    [
      "PartialOffers",
      "PartialRequests",
      "ListingFees",
      "PaymentEvents"
    ],
    [
      "Meetings",
      "Reports",
      "ModerationHistory",
      "Notifications",
      "Activity"
    ]
  ],
  "applicationRules": [
    {
      "title": "Account roles and ownership",
      "text": "The server verifies that property owners are landlords, renters are tenants and moderation is performed by an administrator. Foreign keys only verify that the referenced account exists."
    },
    {
      "title": "Booking and meeting conflicts",
      "text": "SQL foreign keys and date checks do not prevent overlapping intervals. The application checks overlaps and commits state changes inside a serialized database transaction."
    },
    {
      "title": "State transitions and consent",
      "text": "CHECK constraints restrict the stored status values. The server controls their order, agreement acceptance, recipient consent and when a rental may close."
    },
    {
      "title": "Publishing is not rent collection",
      "text": "ListingFees stores JOD 20 property publishing fees or JOD 5 room-offer fees. Rent and deposits are paid directly to the landlord. Development fee confirmations are marked Simulated."
    },
    {
      "title": "Files and JSON contents",
      "text": "Media stores metadata and a storage key, not file contents. ISJSON verifies valid JSON syntax; the application validates the list structure and business meaning."
    },
    {
      "title": "Shared rental consent",
      "text": "A 48-hour roommate invitation is hidden from the landlord until accepted. Inspection, each tenant’s own agreement acceptance, confirmation and key handover are separate server-enforced stages. Changed terms require fresh approvals."
    },
    {
      "title": "Moderation and owner visibility",
      "text": "Properties.ReviewStatus is independent from OwnerWantsPublished. Correction retains paid posting fees. Advertisement action does not close reports; each investigation gets its own recorded outcome. Suspension periods, ownership and user roles are checked by the server."
    },
    {
      "title": "Structured amendment records",
      "text": "RentalAmendments stores original/proposed terms and approver lists as JSON text. The current SQL schema does not add ISJSON checks or foreign keys inside these JSON fields. The server validates their structure, permissions and unanimous consent before applying new terms."
    }
  ]
});
