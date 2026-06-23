SELECT 
    DB_NAME(database_id) AS DatabaseName, 
    type_desc AS FileType,
    name AS LogicalName, 
    Physical_Name AS PhysicalName, 
    (size * 8) / 1024 AS SizeMB
FROM sys.master_files
ORDER BY SizeMB DESC;

-- Check error log size
EXEC xp_enumerrorlogs;
