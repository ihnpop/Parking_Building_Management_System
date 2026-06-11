USE ParkingBuildingManagementSystem;
GO

/* ============================================================
   SEED DATA - Parking Building Management System
   Compatible with the SQL Server 2019 schema previously provided.
   Chạy file này sau khi đã tạo đầy đủ bảng.
   ============================================================ */

SET NOCOUNT ON;
GO

/* Optional cleanup */
DELETE FROM SLOT_ALLOCATION_LOG;
DELETE FROM FEEDBACK;
DELETE FROM INCIDENT_REPORT;
DELETE FROM PAYMENT;
DELETE FROM RESERVATION;
DELETE FROM PARKING_ORDER;
DELETE FROM VEHICLE_PACKAGE;
DELETE FROM PACKAGE;
DELETE FROM PRICE_ITEM;
DELETE FROM PRICE_TABLE;
DELETE FROM CARD;
DELETE FROM SLOT;
DELETE FROM AREA;
DELETE FROM FLOOR;
DELETE FROM GATE;
DELETE FROM VEHICLE;
DELETE FROM CUSTOMER;
DELETE FROM PARKING;
DELETE FROM BUILDING;
DELETE FROM ACCOUNT;
DELETE FROM ROLE;
DELETE FROM VEHICLE_TYPE;
GO

-- 1. ROLE
INSERT INTO ROLE(role_name, description) VALUES (N'SYSTEM_ADMIN', N'Quản trị hệ thống');
INSERT INTO ROLE(role_name, description) VALUES (N'PARKING_MANAGER', N'Quản lý bãi xe');
INSERT INTO ROLE(role_name, description) VALUES (N'PARKING_STAFF', N'Nhân viên bãi xe');
INSERT INTO ROLE(role_name, description) VALUES (N'DRIVER', N'Người gửi xe');
GO

-- 2. VEHICLE_TYPE
INSERT INTO VEHICLE_TYPE(name, description, status) VALUES (N'Motorbike', N'Xe máy', N'ACTIVE');
INSERT INTO VEHICLE_TYPE(name, description, status) VALUES (N'Car', N'Ô tô', N'ACTIVE');
INSERT INTO VEHICLE_TYPE(name, description, status) VALUES (N'Electric Motorbike', N'Xe máy điện', N'ACTIVE');
INSERT INTO VEHICLE_TYPE(name, description, status) VALUES (N'Electric Car', N'Ô tô điện', N'ACTIVE');
INSERT INTO VEHICLE_TYPE(name, description, status) VALUES (N'Bicycle', N'Xe đạp', N'ACTIVE');
GO

-- 3. ACCOUNT

DECLARE @adminRole UNIQUEIDENTIFIER = (SELECT role_id FROM ROLE WHERE role_name = 'SYSTEM_ADMIN');
DECLARE @managerRole UNIQUEIDENTIFIER = (SELECT role_id FROM ROLE WHERE role_name = 'PARKING_MANAGER');
DECLARE @staffRole UNIQUEIDENTIFIER = (SELECT role_id FROM ROLE WHERE role_name = 'PARKING_STAFF');
DECLARE @driverRole UNIQUEIDENTIFIER = (SELECT role_id FROM ROLE WHERE role_name = 'DRIVER');

INSERT INTO ACCOUNT(role_id, username, password_hash, full_name, email, phone, status)
VALUES
(@adminRole, 'admin01', '123456', N'System Administrator', 'admin@parking.com', '0901000001', 'ACTIVE'),
(@managerRole, 'manager01', '123456', N'Parking Manager 01', 'manager01@parking.com', '0901000002', 'ACTIVE'),
(@managerRole, 'manager02', '123456', N'Parking Manager 02', 'manager02@parking.com', '0901000003', 'ACTIVE'),
(@staffRole, 'staff01', '123456', N'Parking Staff 01', 'staff01@parking.com', '0901000011', 'ACTIVE'),
(@staffRole, 'staff02', '123456', N'Parking Staff 02', 'staff02@parking.com', '0901000012', 'ACTIVE'),
(@staffRole, 'staff03', '123456', N'Parking Staff 03', 'staff03@parking.com', '0901000013', 'ACTIVE'),
(@staffRole, 'staff04', '123456', N'Parking Staff 04', 'staff04@parking.com', '0901000014', 'ACTIVE'),
(@staffRole, 'staff05', '123456', N'Parking Staff 05', 'staff05@parking.com', '0901000015', 'ACTIVE'),
(@staffRole, 'staff06', '123456', N'Parking Staff 06', 'staff06@parking.com', '0901000016', 'ACTIVE');
GO

-- 4. BUILDING & PARKING

INSERT INTO BUILDING(name, address, status)
VALUES
(N'Central Parking Building', N'Quận 1, TP. Hồ Chí Minh', 'ACTIVE'),
(N'West Lake Parking Tower', N'Quận Tây Hồ, Hà Nội', 'ACTIVE');

DECLARE @building1 UNIQUEIDENTIFIER = (SELECT building_id FROM BUILDING WHERE name = N'Central Parking Building');
DECLARE @building2 UNIQUEIDENTIFIER = (SELECT building_id FROM BUILDING WHERE name = N'West Lake Parking Tower');

INSERT INTO PARKING(building_id, name, total_capacity, open_time, close_time, status)
VALUES
(@building1, N'Central Main Parking', 600, '05:00', '23:59', 'ACTIVE'),
(@building2, N'West Lake Main Parking', 400, '06:00', '23:00', 'ACTIVE');
GO

-- 5. FLOOR

DECLARE @p1 UNIQUEIDENTIFIER = (SELECT parking_id FROM PARKING WHERE name = N'Central Main Parking');
DECLARE @p2 UNIQUEIDENTIFIER = (SELECT parking_id FROM PARKING WHERE name = N'West Lake Main Parking');

INSERT INTO FLOOR(parking_id, floor_number, name, status)
VALUES
(@p1, 1, N'Central Floor 1', 'ACTIVE'),
(@p1, 2, N'Central Floor 2', 'ACTIVE'),
(@p1, 3, N'Central Floor 3', 'ACTIVE'),
(@p1, 4, N'Central Floor 4', 'ACTIVE'),
(@p1, 5, N'Central Floor 5', 'ACTIVE'),
(@p2, 1, N'West Lake Floor 1', 'ACTIVE'),
(@p2, 2, N'West Lake Floor 2', 'ACTIVE'),
(@p2, 3, N'West Lake Floor 3', 'ACTIVE');
GO

-- 6. AREA

DECLARE @motor UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike');
DECLARE @car UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car');
DECLARE @emotor UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike');
DECLARE @ecar UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car');
DECLARE @bike UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Bicycle');

INSERT INTO AREA(floor_id, vehicle_type_id, name, capacity, status)
SELECT floor_id, @motor, CONCAT(name, N' - Motorbike Area'), 60, 'ACTIVE' FROM FLOOR WHERE floor_number IN (1,2,3);

INSERT INTO AREA(floor_id, vehicle_type_id, name, capacity, status)
SELECT floor_id, @car, CONCAT(name, N' - Car Area'), 40, 'ACTIVE' FROM FLOOR WHERE floor_number IN (2,3,4,5);

INSERT INTO AREA(floor_id, vehicle_type_id, name, capacity, status)
SELECT floor_id, @emotor, CONCAT(name, N' - Electric Motorbike Area'), 30, 'ACTIVE' FROM FLOOR WHERE floor_number IN (1,2);

INSERT INTO AREA(floor_id, vehicle_type_id, name, capacity, status)
SELECT floor_id, @ecar, CONCAT(name, N' - Electric Car Area'), 20, 'ACTIVE' FROM FLOOR WHERE floor_number IN (1,4,5);

INSERT INTO AREA(floor_id, vehicle_type_id, name, capacity, status)
SELECT floor_id, @bike, CONCAT(name, N' - Bicycle Area'), 25, 'ACTIVE' FROM FLOOR WHERE floor_number = 1;
GO

-- 7. SLOT - tạo nhiều slot theo từng area

DECLARE @areaId UNIQUEIDENTIFIER, @areaName NVARCHAR(255), @i INT, @prefix NVARCHAR(20);

DECLARE area_cursor CURSOR FOR
SELECT area_id, name FROM AREA;

OPEN area_cursor;
FETCH NEXT FROM area_cursor INTO @areaId, @areaName;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @i = 1;
    SET @prefix =
        CASE
            WHEN @areaName LIKE '%Motorbike%' AND @areaName NOT LIKE '%Electric%' THEN 'MB'
            WHEN @areaName LIKE '%Car%' AND @areaName NOT LIKE '%Electric%' THEN 'CAR'
            WHEN @areaName LIKE '%Electric Motorbike%' THEN 'EMB'
            WHEN @areaName LIKE '%Electric Car%' THEN 'ECAR'
            WHEN @areaName LIKE '%Bicycle%' THEN 'BI'
            ELSE 'S'
        END;

    WHILE @i <= 25
    BEGIN
        INSERT INTO SLOT(area_id, slot_code, status, distance_to_gate, priority_score)
        VALUES (
            @areaId,
            CONCAT(@prefix, '-', RIGHT('000' + CAST(@i AS NVARCHAR(3)), 3)),
            CASE WHEN @i % 17 = 0 THEN 'MAINTENANCE' ELSE 'AVAILABLE' END,
            10 + (@i * 3),
            CAST(100.0 - (@i * 1.5) AS DECIMAL(10,2))
        );
        SET @i = @i + 1;
    END;

    FETCH NEXT FROM area_cursor INTO @areaId, @areaName;
END

CLOSE area_cursor;
DEALLOCATE area_cursor;
GO

-- 8. GATE

DECLARE @central UNIQUEIDENTIFIER = (SELECT parking_id FROM PARKING WHERE name = N'Central Main Parking');
DECLARE @west UNIQUEIDENTIFIER = (SELECT parking_id FROM PARKING WHERE name = N'West Lake Main Parking');

INSERT INTO GATE(parking_id, name, gate_type, status)
VALUES
(@central, N'Central Gate A - IN', 'IN', 'ACTIVE'),
(@central, N'Central Gate A - OUT', 'OUT', 'ACTIVE'),
(@central, N'Central Gate B - IN', 'IN', 'ACTIVE'),
(@central, N'Central Gate B - OUT', 'OUT', 'ACTIVE'),
(@central, N'Central Gate C - BOTH', 'BOTH', 'ACTIVE'),
(@west, N'West Lake Gate A - IN', 'IN', 'ACTIVE'),
(@west, N'West Lake Gate A - OUT', 'OUT', 'ACTIVE'),
(@west, N'West Lake Gate B - BOTH', 'BOTH', 'ACTIVE');
GO

-- 9. CARD

DECLARE @cardIndex INT = 1;
WHILE @cardIndex <= 200
BEGIN
    INSERT INTO CARD(code, status)
    VALUES (CONCAT('CARD-', RIGHT('0000' + CAST(@cardIndex AS NVARCHAR(4)), 4)), 'AVAILABLE');
    SET @cardIndex += 1;
END
GO

-- 10. PRICE_TABLE & PRICE_ITEM

DECLARE @parkingA UNIQUEIDENTIFIER = (SELECT parking_id FROM PARKING WHERE name = N'Central Main Parking');
DECLARE @parkingB UNIQUEIDENTIFIER = (SELECT parking_id FROM PARKING WHERE name = N'West Lake Main Parking');

INSERT INTO PRICE_TABLE(parking_id, name, description, status)
VALUES
(@parkingA, N'Central Standard Price Table', N'Bảng giá tiêu chuẩn Central', 'ACTIVE'),
(@parkingB, N'West Lake Standard Price Table', N'Bảng giá tiêu chuẩn West Lake', 'ACTIVE');

DECLARE @pt1 UNIQUEIDENTIFIER = (SELECT price_table_id FROM PRICE_TABLE WHERE name = N'Central Standard Price Table');
DECLARE @pt2 UNIQUEIDENTIFIER = (SELECT price_table_id FROM PRICE_TABLE WHERE name = N'West Lake Standard Price Table');

DECLARE @motorT UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike');
DECLARE @carT UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car');
DECLARE @emotorT UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike');
DECLARE @ecarT UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car');
DECLARE @bikeT UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Bicycle');

INSERT INTO PRICE_ITEM(price_table_id, vehicle_type_id, min_hour, max_hour, price)
VALUES
(@pt1, @motorT, 0, 2, 5000), (@pt1, @motorT, 3, 8, 10000), (@pt1, @motorT, 9, NULL, 20000),
(@pt1, @carT, 0, 2, 30000), (@pt1, @carT, 3, 8, 60000), (@pt1, @carT, 9, NULL, 120000),
(@pt1, @emotorT, 0, 2, 6000), (@pt1, @emotorT, 3, 8, 12000), (@pt1, @emotorT, 9, NULL, 24000),
(@pt1, @ecarT, 0, 2, 35000), (@pt1, @ecarT, 3, 8, 70000), (@pt1, @ecarT, 9, NULL, 140000),
(@pt1, @bikeT, 0, 2, 3000), (@pt1, @bikeT, 3, 8, 6000), (@pt1, @bikeT, 9, NULL, 12000),
(@pt2, @motorT, 0, 2, 4000), (@pt2, @motorT, 3, 8, 9000), (@pt2, @motorT, 9, NULL, 18000),
(@pt2, @carT, 0, 2, 25000), (@pt2, @carT, 3, 8, 55000), (@pt2, @carT, 9, NULL, 110000);
GO

-- 11. PACKAGE

DECLARE @m UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike');
DECLARE @c UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car');
DECLARE @em UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike');
DECLARE @ec UNIQUEIDENTIFIER = (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car');

INSERT INTO PACKAGE(vehicle_type_id, name, duration_month, price, status)
VALUES
(@m, N'Gói xe máy 1 tháng', 1, 300000, 'ACTIVE'),
(@m, N'Gói xe máy 3 tháng', 3, 850000, 'ACTIVE'),
(@c, N'Gói ô tô 1 tháng', 1, 2500000, 'ACTIVE'),
(@c, N'Gói ô tô 3 tháng', 3, 7000000, 'ACTIVE'),
(@em, N'Gói xe máy điện 1 tháng', 1, 350000, 'ACTIVE'),
(@ec, N'Gói ô tô điện 1 tháng', 1, 2800000, 'ACTIVE');
GO

-- 12. CUSTOMER & VEHICLE - 120 khách và 120 xe
DECLARE @driverRole2 UNIQUEIDENTIFIER = (SELECT role_id FROM ROLE WHERE role_name = 'DRIVER');

DECLARE @acc1 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc1, @driverRole2, 'driver001', '123456', N'Vo Minh Linh 001', 'customer001@gmail.com', '0999416372', 'ACTIVE');

DECLARE @cus1 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus1, @acc1, N'Vo Minh Linh 001', '0999416372', 'customer001@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus1, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X2-00001', N'Yamaha', N'Red', 'ACTIVE');

DECLARE @acc2 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc2, @driverRole2, 'driver002', '123456', N'Mai Duc Binh 002', 'customer002@gmail.com', '0976411477', 'ACTIVE');

DECLARE @cus2 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus2, @acc2, N'Mai Duc Binh 002', '0976411477', 'customer002@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus2, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X3-00002', N'Piaggio', N'Black', 'ACTIVE');

DECLARE @acc3 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc3, @driverRole2, 'driver003', '123456', N'Pham Quoc Trang 003', 'customer003@gmail.com', '0962197062', 'ACTIVE');

DECLARE @cus3 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus3, @acc3, N'Pham Quoc Trang 003', '0962197062', 'customer003@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus3, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X4-00003', N'Honda', N'Blue', 'ACTIVE');

DECLARE @acc4 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc4, @driverRole2, 'driver004', '123456', N'Do Thi Vy 004', 'customer004@gmail.com', '0964638782', 'ACTIVE');

DECLARE @cus4 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus4, @acc4, N'Do Thi Vy 004', '0964638782', 'customer004@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus4, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X5-00004', N'Suzuki', N'Silver', 'ACTIVE');

DECLARE @acc5 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc5, @driverRole2, 'driver005', '123456', N'Do Gia Khanh 005', 'customer005@gmail.com', '0965209286', 'ACTIVE');

DECLARE @cus5 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus5, @acc5, N'Do Gia Khanh 005', '0965209286', 'customer005@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus5, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car'), N'51A-00005', N'Kia', N'Yellow', 'ACTIVE');

DECLARE @acc6 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc6, @driverRole2, 'driver006', '123456', N'Bui Thi Binh 006', 'customer006@gmail.com', '0957185046', 'ACTIVE');

DECLARE @cus6 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus6, @acc6, N'Bui Thi Binh 006', '0957185046', 'customer006@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus6, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X7-00006', N'Piaggio', N'Green', 'ACTIVE');

DECLARE @acc7 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc7, @driverRole2, 'driver007', '123456', N'Dang Gia Vy 007', 'customer007@gmail.com', '0946272804', 'ACTIVE');

DECLARE @cus7 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus7, @acc7, N'Dang Gia Vy 007', '0946272804', 'customer007@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus7, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X8-00007', N'Dat Bike', N'Red', 'ACTIVE');

DECLARE @acc8 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc8, @driverRole2, 'driver008', '123456', N'Ly Quoc Tuan 008', 'customer008@gmail.com', '0995047721', 'ACTIVE');

DECLARE @cus8 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus8, @acc8, N'Ly Quoc Tuan 008', '0995047721', 'customer008@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus8, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X9-00008', N'Yamaha', N'Yellow', 'ACTIVE');

DECLARE @acc9 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc9, @driverRole2, 'driver009', '123456', N'Bui Duc Phuc 009', 'customer009@gmail.com', '0965904978', 'ACTIVE');

DECLARE @cus9 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus9, @acc9, N'Bui Duc Phuc 009', '0965904978', 'customer009@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus9, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X1-00009', N'Piaggio', N'White', 'ACTIVE');

DECLARE @acc10 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc10, @driverRole2, 'driver010', '123456', N'Bui Quoc Khanh 010', 'customer010@gmail.com', '0966664675', 'ACTIVE');

DECLARE @cus10 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus10, @acc10, N'Bui Quoc Khanh 010', '0966664675', 'customer010@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus10, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car'), N'51A-00010', N'VinFast', N'Silver', 'ACTIVE');

DECLARE @acc11 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc11, @driverRole2, 'driver011', '123456', N'Ly Gia Khanh 011', 'customer011@gmail.com', '0994914729', 'ACTIVE');

DECLARE @cus11 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus11, @acc11, N'Ly Gia Khanh 011', '0994914729', 'customer011@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus11, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X3-00011', N'Suzuki', N'Gray', 'ACTIVE');

DECLARE @acc12 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc12, @driverRole2, 'driver012', '123456', N'Ngo Gia Vy 012', 'customer012@gmail.com', '0972195249', 'ACTIVE');

DECLARE @cus12 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus12, @acc12, N'Ngo Gia Vy 012', '0972195249', 'customer012@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus12, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X4-00012', N'Yamaha', N'Green', 'ACTIVE');

DECLARE @acc13 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc13, @driverRole2, 'driver013', '123456', N'Bui Minh Binh 013', 'customer013@gmail.com', '0969305775', 'ACTIVE');

DECLARE @cus13 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus13, @acc13, N'Bui Minh Binh 013', '0969305775', 'customer013@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus13, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Bicycle'), N'BIKE-00013', N'Giant', N'Green', 'ACTIVE');

DECLARE @acc14 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc14, @driverRole2, 'driver014', '123456', N'Bui Gia Vy 014', 'customer014@gmail.com', '0979541155', 'ACTIVE');

DECLARE @cus14 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus14, @acc14, N'Bui Gia Vy 014', '0979541155', 'customer014@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus14, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X6-00014', N'Dat Bike', N'Green', 'ACTIVE');

DECLARE @acc15 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc15, @driverRole2, 'driver015', '123456', N'Bui Thi Binh 015', 'customer015@gmail.com', '0923511852', 'ACTIVE');

DECLARE @cus15 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus15, @acc15, N'Bui Thi Binh 015', '0923511852', 'customer015@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus15, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car'), N'51A-00015', N'Honda', N'Red', 'ACTIVE');

DECLARE @acc16 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc16, @driverRole2, 'driver016', '123456', N'Do Thanh Giang 016', 'customer016@gmail.com', '0975982956', 'ACTIVE');

DECLARE @cus16 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus16, @acc16, N'Do Thanh Giang 016', '0975982956', 'customer016@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus16, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X8-00016', N'SYM', N'Black', 'ACTIVE');

DECLARE @acc17 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc17, @driverRole2, 'driver017', '123456', N'Vo Hoai Nam 017', 'customer017@gmail.com', '0977226877', 'ACTIVE');

DECLARE @cus17 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus17, @acc17, N'Vo Hoai Nam 017', '0977226877', 'customer017@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus17, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X9-00017', N'SYM', N'Red', 'ACTIVE');

DECLARE @acc18 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc18, @driverRole2, 'driver018', '123456', N'Pham Thanh Hieu 018', 'customer018@gmail.com', '0983559629', 'ACTIVE');

DECLARE @cus18 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus18, @acc18, N'Pham Thanh Hieu 018', '0983559629', 'customer018@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus18, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X1-00018', N'Yamaha', N'White', 'ACTIVE');

DECLARE @acc19 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc19, @driverRole2, 'driver019', '123456', N'Bui Minh An 019', 'customer019@gmail.com', '0973033066', 'ACTIVE');

DECLARE @cus19 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus19, @acc19, N'Bui Minh An 019', '0973033066', 'customer019@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus19, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X2-00019', N'Suzuki', N'Blue', 'ACTIVE');

DECLARE @acc20 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc20, @driverRole2, 'driver020', '123456', N'Duong Minh Chau 020', 'customer020@gmail.com', '0979639404', 'ACTIVE');

DECLARE @cus20 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus20, @acc20, N'Duong Minh Chau 020', '0979639404', 'customer020@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus20, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car'), N'51A-00020', N'VinFast', N'Gray', 'ACTIVE');

DECLARE @acc21 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc21, @driverRole2, 'driver021', '123456', N'Mai Bao Chau 021', 'customer021@gmail.com', '0982131260', 'ACTIVE');

DECLARE @cus21 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus21, @acc21, N'Mai Bao Chau 021', '0982131260', 'customer021@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus21, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X4-00021', N'Yadea', N'Black', 'ACTIVE');

DECLARE @acc22 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc22, @driverRole2, 'driver022', '123456', N'Do Quoc Vy 022', 'customer022@gmail.com', '0942170180', 'ACTIVE');

DECLARE @cus22 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus22, @acc22, N'Do Quoc Vy 022', '0942170180', 'customer022@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus22, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X5-00022', N'Honda', N'White', 'ACTIVE');

DECLARE @acc23 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc23, @driverRole2, 'driver023', '123456', N'Mai Van Nam 023', 'customer023@gmail.com', '0938611906', 'ACTIVE');

DECLARE @cus23 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus23, @acc23, N'Mai Van Nam 023', '0938611906', 'customer023@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus23, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X6-00023', N'Piaggio', N'Black', 'ACTIVE');

DECLARE @acc24 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc24, @driverRole2, 'driver024', '123456', N'Vu Minh Phuc 024', 'customer024@gmail.com', '0934932987', 'ACTIVE');

DECLARE @cus24 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus24, @acc24, N'Vu Minh Phuc 024', '0934932987', 'customer024@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus24, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X7-00024', N'Honda', N'Red', 'ACTIVE');

DECLARE @acc25 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc25, @driverRole2, 'driver025', '123456', N'Mai Bao Giang 025', 'customer025@gmail.com', '0918854907', 'ACTIVE');

DECLARE @cus25 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus25, @acc25, N'Mai Bao Giang 025', '0918854907', 'customer025@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus25, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car'), N'51A-00025', N'Kia', N'Black', 'ACTIVE');

DECLARE @acc26 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc26, @driverRole2, 'driver026', '123456', N'Nguyen Duc Giang 026', 'customer026@gmail.com', '0910412068', 'ACTIVE');

DECLARE @cus26 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus26, @acc26, N'Nguyen Duc Giang 026', '0910412068', 'customer026@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus26, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Bicycle'), N'BIKE-00026', N'Asama', N'Silver', 'ACTIVE');

DECLARE @acc27 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc27, @driverRole2, 'driver027', '123456', N'Vu Hoai Binh 027', 'customer027@gmail.com', '0981161342', 'ACTIVE');

DECLARE @cus27 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus27, @acc27, N'Vu Hoai Binh 027', '0981161342', 'customer027@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus27, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X1-00027', N'Yamaha', N'Black', 'ACTIVE');

DECLARE @acc28 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc28, @driverRole2, 'driver028', '123456', N'Duong Minh Giang 028', 'customer028@gmail.com', '0933781034', 'ACTIVE');

DECLARE @cus28 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus28, @acc28, N'Duong Minh Giang 028', '0933781034', 'customer028@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus28, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X2-00028', N'VinFast', N'Green', 'ACTIVE');

DECLARE @acc29 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc29, @driverRole2, 'driver029', '123456', N'Duong Quoc Linh 029', 'customer029@gmail.com', '0981500530', 'ACTIVE');

DECLARE @cus29 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus29, @acc29, N'Duong Quoc Linh 029', '0981500530', 'customer029@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus29, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X3-00029', N'Piaggio', N'Green', 'ACTIVE');

DECLARE @acc30 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc30, @driverRole2, 'driver030', '123456', N'Pham Hoai Chau 030', 'customer030@gmail.com', '0936437173', 'ACTIVE');

DECLARE @cus30 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus30, @acc30, N'Pham Hoai Chau 030', '0936437173', 'customer030@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus30, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car'), N'51A-00030', N'BYD', N'Red', 'ACTIVE');

DECLARE @acc31 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc31, @driverRole2, 'driver031', '123456', N'Vo Duc Dung 031', 'customer031@gmail.com', '0971835935', 'ACTIVE');

DECLARE @cus31 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus31, @acc31, N'Vo Duc Dung 031', '0971835935', 'customer031@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus31, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X5-00031', N'Honda', N'White', 'ACTIVE');

DECLARE @acc32 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc32, @driverRole2, 'driver032', '123456', N'Do Thanh Nam 032', 'customer032@gmail.com', '0938080400', 'ACTIVE');

DECLARE @cus32 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus32, @acc32, N'Do Thanh Nam 032', '0938080400', 'customer032@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus32, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X6-00032', N'Yamaha', N'Black', 'ACTIVE');

DECLARE @acc33 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc33, @driverRole2, 'driver033', '123456', N'Mai Bao Tuan 033', 'customer033@gmail.com', '0930357590', 'ACTIVE');

DECLARE @cus33 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus33, @acc33, N'Mai Bao Tuan 033', '0930357590', 'customer033@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus33, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X7-00033', N'Yamaha', N'Silver', 'ACTIVE');

DECLARE @acc34 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc34, @driverRole2, 'driver034', '123456', N'Vo Gia Phuc 034', 'customer034@gmail.com', '0997239191', 'ACTIVE');

DECLARE @cus34 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus34, @acc34, N'Vo Gia Phuc 034', '0997239191', 'customer034@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus34, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X8-00034', N'Honda', N'Silver', 'ACTIVE');

DECLARE @acc35 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc35, @driverRole2, 'driver035', '123456', N'Bui Gia Thao 035', 'customer035@gmail.com', '0969995254', 'ACTIVE');

DECLARE @cus35 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus35, @acc35, N'Bui Gia Thao 035', '0969995254', 'customer035@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus35, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car'), N'51A-00035', N'Honda', N'Blue', 'ACTIVE');

DECLARE @acc36 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc36, @driverRole2, 'driver036', '123456', N'Vu Duc Phuc 036', 'customer036@gmail.com', '0974967808', 'ACTIVE');

DECLARE @cus36 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus36, @acc36, N'Vu Duc Phuc 036', '0974967808', 'customer036@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus36, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X1-00036', N'Suzuki', N'Green', 'ACTIVE');

DECLARE @acc37 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc37, @driverRole2, 'driver037', '123456', N'Ly Bao An 037', 'customer037@gmail.com', '0912889255', 'ACTIVE');

DECLARE @cus37 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus37, @acc37, N'Ly Bao An 037', '0912889255', 'customer037@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus37, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X2-00037', N'Yamaha', N'White', 'ACTIVE');

DECLARE @acc38 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc38, @driverRole2, 'driver038', '123456', N'Le Thi An 038', 'customer038@gmail.com', '0937288401', 'ACTIVE');

DECLARE @cus38 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus38, @acc38, N'Le Thi An 038', '0937288401', 'customer038@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus38, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X3-00038', N'Suzuki', N'Yellow', 'ACTIVE');

DECLARE @acc39 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc39, @driverRole2, 'driver039', '123456', N'Duong Van Khanh 039', 'customer039@gmail.com', '0946097795', 'ACTIVE');

DECLARE @cus39 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus39, @acc39, N'Duong Van Khanh 039', '0946097795', 'customer039@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus39, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Bicycle'), N'BIKE-00039', N'Thống Nhất', N'Yellow', 'ACTIVE');

DECLARE @acc40 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc40, @driverRole2, 'driver040', '123456', N'Do Minh Nam 040', 'customer040@gmail.com', '0942805044', 'ACTIVE');

DECLARE @cus40 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus40, @acc40, N'Do Minh Nam 040', '0942805044', 'customer040@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus40, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car'), N'51A-00040', N'Tesla', N'Green', 'ACTIVE');

DECLARE @acc41 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc41, @driverRole2, 'driver041', '123456', N'Mai Duc Linh 041', 'customer041@gmail.com', '0997723506', 'ACTIVE');

DECLARE @cus41 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus41, @acc41, N'Mai Duc Linh 041', '0997723506', 'customer041@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus41, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X6-00041', N'Piaggio', N'Red', 'ACTIVE');

DECLARE @acc42 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc42, @driverRole2, 'driver042', '123456', N'Mai Gia Quan 042', 'customer042@gmail.com', '0997414300', 'ACTIVE');

DECLARE @cus42 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus42, @acc42, N'Mai Gia Quan 042', '0997414300', 'customer042@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus42, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X7-00042', N'Dat Bike', N'Black', 'ACTIVE');

DECLARE @acc43 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc43, @driverRole2, 'driver043', '123456', N'Bui Duc Linh 043', 'customer043@gmail.com', '0914941707', 'ACTIVE');

DECLARE @cus43 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus43, @acc43, N'Bui Duc Linh 043', '0914941707', 'customer043@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus43, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X8-00043', N'Suzuki', N'Silver', 'ACTIVE');

DECLARE @acc44 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc44, @driverRole2, 'driver044', '123456', N'Tran Quoc Nam 044', 'customer044@gmail.com', '0983482694', 'ACTIVE');

DECLARE @cus44 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus44, @acc44, N'Tran Quoc Nam 044', '0983482694', 'customer044@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus44, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X9-00044', N'Suzuki', N'Red', 'ACTIVE');

DECLARE @acc45 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc45, @driverRole2, 'driver045', '123456', N'Vu Bao An 045', 'customer045@gmail.com', '0976517503', 'ACTIVE');

DECLARE @cus45 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus45, @acc45, N'Vu Bao An 045', '0976517503', 'customer045@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus45, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car'), N'51A-00045', N'Hyundai', N'Blue', 'ACTIVE');

DECLARE @acc46 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc46, @driverRole2, 'driver046', '123456', N'Do Hoai Quan 046', 'customer046@gmail.com', '0994012141', 'ACTIVE');

DECLARE @cus46 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus46, @acc46, N'Do Hoai Quan 046', '0994012141', 'customer046@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus46, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X2-00046', N'Yamaha', N'Yellow', 'ACTIVE');

DECLARE @acc47 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc47, @driverRole2, 'driver047', '123456', N'Hoang Van Vy 047', 'customer047@gmail.com', '0981036378', 'ACTIVE');

DECLARE @cus47 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus47, @acc47, N'Hoang Van Vy 047', '0981036378', 'customer047@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus47, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X3-00047', N'Piaggio', N'Gray', 'ACTIVE');

DECLARE @acc48 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc48, @driverRole2, 'driver048', '123456', N'Bui Minh Binh 048', 'customer048@gmail.com', '0998830610', 'ACTIVE');

DECLARE @cus48 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus48, @acc48, N'Bui Minh Binh 048', '0998830610', 'customer048@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus48, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X4-00048', N'Yamaha', N'Gray', 'ACTIVE');

DECLARE @acc49 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc49, @driverRole2, 'driver049', '123456', N'Mai Quoc Quan 049', 'customer049@gmail.com', '0999302102', 'ACTIVE');

DECLARE @cus49 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus49, @acc49, N'Mai Quoc Quan 049', '0999302102', 'customer049@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus49, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X5-00049', N'Pega', N'Black', 'ACTIVE');

DECLARE @acc50 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc50, @driverRole2, 'driver050', '123456', N'Mai Thi Nam 050', 'customer050@gmail.com', '0957014900', 'ACTIVE');

DECLARE @cus50 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus50, @acc50, N'Mai Thi Nam 050', '0957014900', 'customer050@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus50, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car'), N'51A-00050', N'VinFast', N'Gray', 'ACTIVE');

DECLARE @acc51 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc51, @driverRole2, 'driver051', '123456', N'Hoang Minh Dung 051', 'customer051@gmail.com', '0953266325', 'ACTIVE');

DECLARE @cus51 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus51, @acc51, N'Hoang Minh Dung 051', '0953266325', 'customer051@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus51, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X7-00051', N'SYM', N'Red', 'ACTIVE');

DECLARE @acc52 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc52, @driverRole2, 'driver052', '123456', N'Ngo Thanh Dung 052', 'customer052@gmail.com', '0920674739', 'ACTIVE');

DECLARE @cus52 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus52, @acc52, N'Ngo Thanh Dung 052', '0920674739', 'customer052@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus52, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Bicycle'), N'BIKE-00052', N'Trek', N'Black', 'ACTIVE');

DECLARE @acc53 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc53, @driverRole2, 'driver053', '123456', N'Mai Thanh Son 053', 'customer053@gmail.com', '0920945396', 'ACTIVE');

DECLARE @cus53 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus53, @acc53, N'Mai Thanh Son 053', '0920945396', 'customer053@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus53, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X9-00053', N'Suzuki', N'Green', 'ACTIVE');

DECLARE @acc54 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc54, @driverRole2, 'driver054', '123456', N'Mai Quoc Binh 054', 'customer054@gmail.com', '0926792116', 'ACTIVE');

DECLARE @cus54 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus54, @acc54, N'Mai Quoc Binh 054', '0926792116', 'customer054@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus54, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X1-00054', N'Honda', N'Red', 'ACTIVE');

DECLARE @acc55 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc55, @driverRole2, 'driver055', '123456', N'Phan Bao Linh 055', 'customer055@gmail.com', '0984471402', 'ACTIVE');

DECLARE @cus55 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus55, @acc55, N'Phan Bao Linh 055', '0984471402', 'customer055@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus55, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car'), N'51A-00055', N'Ford', N'Blue', 'ACTIVE');

DECLARE @acc56 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc56, @driverRole2, 'driver056', '123456', N'Ly Gia Tuan 056', 'customer056@gmail.com', '0970339322', 'ACTIVE');

DECLARE @cus56 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus56, @acc56, N'Ly Gia Tuan 056', '0970339322', 'customer056@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus56, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X3-00056', N'VinFast', N'Silver', 'ACTIVE');

DECLARE @acc57 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc57, @driverRole2, 'driver057', '123456', N'Duong Thanh Son 057', 'customer057@gmail.com', '0940517790', 'ACTIVE');

DECLARE @cus57 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus57, @acc57, N'Duong Thanh Son 057', '0940517790', 'customer057@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus57, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X4-00057', N'Honda', N'Black', 'ACTIVE');

DECLARE @acc58 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc58, @driverRole2, 'driver058', '123456', N'Duong Bao Vy 058', 'customer058@gmail.com', '0944024154', 'ACTIVE');

DECLARE @cus58 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus58, @acc58, N'Duong Bao Vy 058', '0944024154', 'customer058@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus58, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X5-00058', N'Piaggio', N'Blue', 'ACTIVE');

DECLARE @acc59 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc59, @driverRole2, 'driver059', '123456', N'Do Thi Tuan 059', 'customer059@gmail.com', '0955016432', 'ACTIVE');

DECLARE @cus59 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus59, @acc59, N'Do Thi Tuan 059', '0955016432', 'customer059@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus59, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X6-00059', N'SYM', N'Black', 'ACTIVE');

DECLARE @acc60 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc60, @driverRole2, 'driver060', '123456', N'Nguyen Bao Hieu 060', 'customer060@gmail.com', '0924837087', 'ACTIVE');

DECLARE @cus60 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus60, @acc60, N'Nguyen Bao Hieu 060', '0924837087', 'customer060@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus60, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car'), N'51A-00060', N'VinFast', N'Red', 'ACTIVE');

DECLARE @acc61 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc61, @driverRole2, 'driver061', '123456', N'Ly Bao Trang 061', 'customer061@gmail.com', '0974048366', 'ACTIVE');

DECLARE @cus61 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus61, @acc61, N'Ly Bao Trang 061', '0974048366', 'customer061@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus61, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X8-00061', N'Honda', N'Silver', 'ACTIVE');

DECLARE @acc62 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc62, @driverRole2, 'driver062', '123456', N'Phan Hoai Dung 062', 'customer062@gmail.com', '0946361185', 'ACTIVE');

DECLARE @cus62 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus62, @acc62, N'Phan Hoai Dung 062', '0946361185', 'customer062@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus62, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X9-00062', N'Honda', N'Green', 'ACTIVE');

DECLARE @acc63 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc63, @driverRole2, 'driver063', '123456', N'Do Duc Chau 063', 'customer063@gmail.com', '0966947196', 'ACTIVE');

DECLARE @cus63 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus63, @acc63, N'Do Duc Chau 063', '0966947196', 'customer063@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus63, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X1-00063', N'VinFast', N'Gray', 'ACTIVE');

DECLARE @acc64 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc64, @driverRole2, 'driver064', '123456', N'Ly Gia Nam 064', 'customer064@gmail.com', '0935359631', 'ACTIVE');

DECLARE @cus64 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus64, @acc64, N'Ly Gia Nam 064', '0935359631', 'customer064@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus64, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X2-00064', N'Suzuki', N'Yellow', 'ACTIVE');

DECLARE @acc65 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc65, @driverRole2, 'driver065', '123456', N'Dang Bao Hieu 065', 'customer065@gmail.com', '0920244415', 'ACTIVE');

DECLARE @cus65 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus65, @acc65, N'Dang Bao Hieu 065', '0920244415', 'customer065@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus65, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car'), N'51A-00065', N'Honda', N'Yellow', 'ACTIVE');

DECLARE @acc66 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc66, @driverRole2, 'driver066', '123456', N'Le Hoai Dung 066', 'customer066@gmail.com', '0955522110', 'ACTIVE');

DECLARE @cus66 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus66, @acc66, N'Le Hoai Dung 066', '0955522110', 'customer066@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus66, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X4-00066', N'Honda', N'Blue', 'ACTIVE');

DECLARE @acc67 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc67, @driverRole2, 'driver067', '123456', N'Duong Hoai An 067', 'customer067@gmail.com', '0969652677', 'ACTIVE');

DECLARE @cus67 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus67, @acc67, N'Duong Hoai An 067', '0969652677', 'customer067@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus67, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X5-00067', N'Honda', N'Yellow', 'ACTIVE');

DECLARE @acc68 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc68, @driverRole2, 'driver068', '123456', N'Vu Gia Nam 068', 'customer068@gmail.com', '0993858555', 'ACTIVE');

DECLARE @cus68 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus68, @acc68, N'Vu Gia Nam 068', '0993858555', 'customer068@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus68, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X6-00068', N'Piaggio', N'White', 'ACTIVE');

DECLARE @acc69 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc69, @driverRole2, 'driver069', '123456', N'Hoang Gia Phuc 069', 'customer069@gmail.com', '0925541263', 'ACTIVE');

DECLARE @cus69 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus69, @acc69, N'Hoang Gia Phuc 069', '0925541263', 'customer069@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus69, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X7-00069', N'Suzuki', N'Green', 'ACTIVE');

DECLARE @acc70 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc70, @driverRole2, 'driver070', '123456', N'Pham Gia Quan 070', 'customer070@gmail.com', '0949413571', 'ACTIVE');

DECLARE @cus70 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus70, @acc70, N'Pham Gia Quan 070', '0949413571', 'customer070@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus70, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car'), N'51A-00070', N'VinFast', N'Black', 'ACTIVE');

DECLARE @acc71 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc71, @driverRole2, 'driver071', '123456', N'Nguyen Thanh Linh 071', 'customer071@gmail.com', '0926859060', 'ACTIVE');

DECLARE @cus71 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus71, @acc71, N'Nguyen Thanh Linh 071', '0926859060', 'customer071@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus71, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X9-00071', N'Honda', N'White', 'ACTIVE');

DECLARE @acc72 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc72, @driverRole2, 'driver072', '123456', N'Le Gia Binh 072', 'customer072@gmail.com', '0998963767', 'ACTIVE');

DECLARE @cus72 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus72, @acc72, N'Le Gia Binh 072', '0998963767', 'customer072@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus72, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X1-00072', N'SYM', N'Yellow', 'ACTIVE');

DECLARE @acc73 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc73, @driverRole2, 'driver073', '123456', N'Nguyen Minh Quan 073', 'customer073@gmail.com', '0978499430', 'ACTIVE');

DECLARE @cus73 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus73, @acc73, N'Nguyen Minh Quan 073', '0978499430', 'customer073@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus73, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X2-00073', N'Piaggio', N'Silver', 'ACTIVE');

DECLARE @acc74 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc74, @driverRole2, 'driver074', '123456', N'Nguyen Gia Chau 074', 'customer074@gmail.com', '0973915762', 'ACTIVE');

DECLARE @cus74 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus74, @acc74, N'Nguyen Gia Chau 074', '0973915762', 'customer074@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus74, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X3-00074', N'SYM', N'Black', 'ACTIVE');

DECLARE @acc75 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc75, @driverRole2, 'driver075', '123456', N'Do Bao Binh 075', 'customer075@gmail.com', '0913774706', 'ACTIVE');

DECLARE @cus75 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus75, @acc75, N'Do Bao Binh 075', '0913774706', 'customer075@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus75, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car'), N'51A-00075', N'Toyota', N'White', 'ACTIVE');

DECLARE @acc76 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc76, @driverRole2, 'driver076', '123456', N'Phan Hoai Binh 076', 'customer076@gmail.com', '0981229743', 'ACTIVE');

DECLARE @cus76 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus76, @acc76, N'Phan Hoai Binh 076', '0981229743', 'customer076@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus76, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X5-00076', N'SYM', N'Yellow', 'ACTIVE');

DECLARE @acc77 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc77, @driverRole2, 'driver077', '123456', N'Tran Duc Nam 077', 'customer077@gmail.com', '0987394942', 'ACTIVE');

DECLARE @cus77 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus77, @acc77, N'Tran Duc Nam 077', '0987394942', 'customer077@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus77, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X6-00077', N'VinFast', N'Black', 'ACTIVE');

DECLARE @acc78 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc78, @driverRole2, 'driver078', '123456', N'Phan Hoai Chau 078', 'customer078@gmail.com', '0970026616', 'ACTIVE');

DECLARE @cus78 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus78, @acc78, N'Phan Hoai Chau 078', '0970026616', 'customer078@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus78, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Bicycle'), N'BIKE-00078', N'Asama', N'Red', 'ACTIVE');

DECLARE @acc79 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc79, @driverRole2, 'driver079', '123456', N'Tran Duc Chau 079', 'customer079@gmail.com', '0993077801', 'ACTIVE');

DECLARE @cus79 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus79, @acc79, N'Tran Duc Chau 079', '0993077801', 'customer079@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus79, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X8-00079', N'Suzuki', N'Green', 'ACTIVE');

DECLARE @acc80 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc80, @driverRole2, 'driver080', '123456', N'Le Anh Chau 080', 'customer080@gmail.com', '0929031461', 'ACTIVE');

DECLARE @cus80 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus80, @acc80, N'Le Anh Chau 080', '0929031461', 'customer080@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus80, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car'), N'51A-00080', N'VinFast', N'White', 'ACTIVE');

DECLARE @acc81 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc81, @driverRole2, 'driver081', '123456', N'Pham Hoai Nam 081', 'customer081@gmail.com', '0995496879', 'ACTIVE');

DECLARE @cus81 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus81, @acc81, N'Pham Hoai Nam 081', '0995496879', 'customer081@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus81, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X1-00081', N'Yamaha', N'White', 'ACTIVE');

DECLARE @acc82 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc82, @driverRole2, 'driver082', '123456', N'Le Van Thao 082', 'customer082@gmail.com', '0998588327', 'ACTIVE');

DECLARE @cus82 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus82, @acc82, N'Le Van Thao 082', '0998588327', 'customer082@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus82, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X2-00082', N'SYM', N'Blue', 'ACTIVE');

DECLARE @acc83 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc83, @driverRole2, 'driver083', '123456', N'Phan Thanh Phuc 083', 'customer083@gmail.com', '0986442811', 'ACTIVE');

DECLARE @cus83 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus83, @acc83, N'Phan Thanh Phuc 083', '0986442811', 'customer083@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus83, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X3-00083', N'Piaggio', N'Red', 'ACTIVE');

DECLARE @acc84 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc84, @driverRole2, 'driver084', '123456', N'Dang Thanh An 084', 'customer084@gmail.com', '0961443318', 'ACTIVE');

DECLARE @cus84 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus84, @acc84, N'Dang Thanh An 084', '0961443318', 'customer084@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus84, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X4-00084', N'Dat Bike', N'Green', 'ACTIVE');

DECLARE @acc85 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc85, @driverRole2, 'driver085', '123456', N'Pham Anh An 085', 'customer085@gmail.com', '0953393671', 'ACTIVE');

DECLARE @cus85 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus85, @acc85, N'Pham Anh An 085', '0953393671', 'customer085@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus85, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car'), N'51A-00085', N'Kia', N'White', 'ACTIVE');

DECLARE @acc86 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc86, @driverRole2, 'driver086', '123456', N'Duong Van Son 086', 'customer086@gmail.com', '0967280796', 'ACTIVE');

DECLARE @cus86 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus86, @acc86, N'Duong Van Son 086', '0967280796', 'customer086@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus86, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X6-00086', N'Yamaha', N'Blue', 'ACTIVE');

DECLARE @acc87 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc87, @driverRole2, 'driver087', '123456', N'Ngo Van Thao 087', 'customer087@gmail.com', '0971749406', 'ACTIVE');

DECLARE @cus87 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus87, @acc87, N'Ngo Van Thao 087', '0971749406', 'customer087@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus87, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X7-00087', N'SYM', N'White', 'ACTIVE');

DECLARE @acc88 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc88, @driverRole2, 'driver088', '123456', N'Mai Minh Phuc 088', 'customer088@gmail.com', '0926615491', 'ACTIVE');

DECLARE @cus88 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus88, @acc88, N'Mai Minh Phuc 088', '0926615491', 'customer088@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus88, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X8-00088', N'Honda', N'Blue', 'ACTIVE');

DECLARE @acc89 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc89, @driverRole2, 'driver089', '123456', N'Duong Thanh Vy 089', 'customer089@gmail.com', '0932946944', 'ACTIVE');

DECLARE @cus89 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus89, @acc89, N'Duong Thanh Vy 089', '0932946944', 'customer089@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus89, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X9-00089', N'Piaggio', N'Red', 'ACTIVE');

DECLARE @acc90 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc90, @driverRole2, 'driver090', '123456', N'Nguyen Anh Khanh 090', 'customer090@gmail.com', '0930390933', 'ACTIVE');

DECLARE @cus90 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus90, @acc90, N'Nguyen Anh Khanh 090', '0930390933', 'customer090@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus90, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car'), N'51A-00090', N'BYD', N'Silver', 'ACTIVE');

DECLARE @acc91 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc91, @driverRole2, 'driver091', '123456', N'Le Duc Nam 091', 'customer091@gmail.com', '0981112484', 'ACTIVE');

DECLARE @cus91 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus91, @acc91, N'Le Duc Nam 091', '0981112484', 'customer091@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus91, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X2-00091', N'VinFast', N'Silver', 'ACTIVE');

DECLARE @acc92 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc92, @driverRole2, 'driver092', '123456', N'Pham Van Khanh 092', 'customer092@gmail.com', '0931269984', 'ACTIVE');

DECLARE @cus92 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus92, @acc92, N'Pham Van Khanh 092', '0931269984', 'customer092@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus92, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X3-00092', N'Yamaha', N'Red', 'ACTIVE');

DECLARE @acc93 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc93, @driverRole2, 'driver093', '123456', N'Bui Van Quan 093', 'customer093@gmail.com', '0970685941', 'ACTIVE');

DECLARE @cus93 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus93, @acc93, N'Bui Van Quan 093', '0970685941', 'customer093@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus93, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X4-00093', N'SYM', N'Silver', 'ACTIVE');

DECLARE @acc94 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc94, @driverRole2, 'driver094', '123456', N'Dang Anh Dung 094', 'customer094@gmail.com', '0934348596', 'ACTIVE');

DECLARE @cus94 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus94, @acc94, N'Dang Anh Dung 094', '0934348596', 'customer094@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus94, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X5-00094', N'Suzuki', N'Gray', 'ACTIVE');

DECLARE @acc95 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc95, @driverRole2, 'driver095', '123456', N'Nguyen Hoai Son 095', 'customer095@gmail.com', '0968138177', 'ACTIVE');

DECLARE @cus95 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus95, @acc95, N'Nguyen Hoai Son 095', '0968138177', 'customer095@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus95, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car'), N'51A-00095', N'Mazda', N'Green', 'ACTIVE');

DECLARE @acc96 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc96, @driverRole2, 'driver096', '123456', N'Tran Minh Vy 096', 'customer096@gmail.com', '0993781060', 'ACTIVE');

DECLARE @cus96 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus96, @acc96, N'Tran Minh Vy 096', '0993781060', 'customer096@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus96, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X7-00096', N'Suzuki', N'Black', 'ACTIVE');

DECLARE @acc97 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc97, @driverRole2, 'driver097', '123456', N'Duong Quoc Nam 097', 'customer097@gmail.com', '0966878632', 'ACTIVE');

DECLARE @cus97 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus97, @acc97, N'Duong Quoc Nam 097', '0966878632', 'customer097@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus97, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X8-00097', N'Piaggio', N'Yellow', 'ACTIVE');

DECLARE @acc98 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc98, @driverRole2, 'driver098', '123456', N'Ly Duc Binh 098', 'customer098@gmail.com', '0993824663', 'ACTIVE');

DECLARE @cus98 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus98, @acc98, N'Ly Duc Binh 098', '0993824663', 'customer098@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus98, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X9-00098', N'Dat Bike', N'Blue', 'ACTIVE');

DECLARE @acc99 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc99, @driverRole2, 'driver099', '123456', N'Phan Quoc Dung 099', 'customer099@gmail.com', '0945412941', 'ACTIVE');

DECLARE @cus99 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus99, @acc99, N'Phan Quoc Dung 099', '0945412941', 'customer099@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus99, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X1-00099', N'Yamaha', N'Green', 'ACTIVE');

DECLARE @acc100 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc100, @driverRole2, 'driver100', '123456', N'Dang Hoai Khanh 100', 'customer100@gmail.com', '0994879503', 'ACTIVE');

DECLARE @cus100 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus100, @acc100, N'Dang Hoai Khanh 100', '0994879503', 'customer100@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus100, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car'), N'51A-00100', N'Tesla', N'Silver', 'ACTIVE');

DECLARE @acc101 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc101, @driverRole2, 'driver101', '123456', N'Vu Van Binh 101', 'customer101@gmail.com', '0922100850', 'ACTIVE');

DECLARE @cus101 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus101, @acc101, N'Vu Van Binh 101', '0922100850', 'customer101@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus101, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X3-00101', N'Honda', N'Black', 'ACTIVE');

DECLARE @acc102 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc102, @driverRole2, 'driver102', '123456', N'Dang Thanh Linh 102', 'customer102@gmail.com', '0969733814', 'ACTIVE');

DECLARE @cus102 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus102, @acc102, N'Dang Thanh Linh 102', '0969733814', 'customer102@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus102, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X4-00102', N'SYM', N'Blue', 'ACTIVE');

DECLARE @acc103 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc103, @driverRole2, 'driver103', '123456', N'Do Bao Tuan 103', 'customer103@gmail.com', '0961895201', 'ACTIVE');

DECLARE @cus103 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus103, @acc103, N'Do Bao Tuan 103', '0961895201', 'customer103@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus103, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X5-00103', N'SYM', N'White', 'ACTIVE');

DECLARE @acc104 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc104, @driverRole2, 'driver104', '123456', N'Hoang Gia Trang 104', 'customer104@gmail.com', '0965825465', 'ACTIVE');

DECLARE @cus104 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus104, @acc104, N'Hoang Gia Trang 104', '0965825465', 'customer104@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus104, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Bicycle'), N'BIKE-00104', N'Asama', N'Gray', 'ACTIVE');

DECLARE @acc105 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc105, @driverRole2, 'driver105', '123456', N'Nguyen Anh Vy 105', 'customer105@gmail.com', '0996455986', 'ACTIVE');

DECLARE @cus105 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus105, @acc105, N'Nguyen Anh Vy 105', '0996455986', 'customer105@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus105, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car'), N'51A-00105', N'Hyundai', N'Red', 'ACTIVE');

DECLARE @acc106 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc106, @driverRole2, 'driver106', '123456', N'Ly Duc Chau 106', 'customer106@gmail.com', '0996946155', 'ACTIVE');

DECLARE @cus106 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus106, @acc106, N'Ly Duc Chau 106', '0996946155', 'customer106@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus106, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X8-00106', N'Honda', N'Blue', 'ACTIVE');

DECLARE @acc107 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc107, @driverRole2, 'driver107', '123456', N'Dang Thi Quan 107', 'customer107@gmail.com', '0986612303', 'ACTIVE');

DECLARE @cus107 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus107, @acc107, N'Dang Thi Quan 107', '0986612303', 'customer107@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus107, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X9-00107', N'Suzuki', N'Blue', 'ACTIVE');

DECLARE @acc108 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc108, @driverRole2, 'driver108', '123456', N'Hoang Van Binh 108', 'customer108@gmail.com', '0991431480', 'ACTIVE');

DECLARE @cus108 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus108, @acc108, N'Hoang Van Binh 108', '0991431480', 'customer108@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus108, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X1-00108', N'Piaggio', N'Green', 'ACTIVE');

DECLARE @acc109 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc109, @driverRole2, 'driver109', '123456', N'Bui Thi Tuan 109', 'customer109@gmail.com', '0950245779', 'ACTIVE');

DECLARE @cus109 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus109, @acc109, N'Bui Thi Tuan 109', '0950245779', 'customer109@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus109, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X2-00109', N'Yamaha', N'Blue', 'ACTIVE');

DECLARE @acc110 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc110, @driverRole2, 'driver110', '123456', N'Vu Thi Linh 110', 'customer110@gmail.com', '0990847656', 'ACTIVE');

DECLARE @cus110 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus110, @acc110, N'Vu Thi Linh 110', '0990847656', 'customer110@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus110, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car'), N'51A-00110', N'BYD', N'Yellow', 'ACTIVE');

DECLARE @acc111 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc111, @driverRole2, 'driver111', '123456', N'Tran Van Thao 111', 'customer111@gmail.com', '0996706890', 'ACTIVE');

DECLARE @cus111 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus111, @acc111, N'Tran Van Thao 111', '0996706890', 'customer111@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus111, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X4-00111', N'Honda', N'Red', 'ACTIVE');

DECLARE @acc112 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc112, @driverRole2, 'driver112', '123456', N'Ngo Quoc Phuc 112', 'customer112@gmail.com', '0918037105', 'ACTIVE');

DECLARE @cus112 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus112, @acc112, N'Ngo Quoc Phuc 112', '0918037105', 'customer112@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus112, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X5-00112', N'Pega', N'Green', 'ACTIVE');

DECLARE @acc113 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc113, @driverRole2, 'driver113', '123456', N'Bui Van Phuc 113', 'customer113@gmail.com', '0939352379', 'ACTIVE');

DECLARE @cus113 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus113, @acc113, N'Bui Van Phuc 113', '0939352379', 'customer113@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus113, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X6-00113', N'Piaggio', N'Blue', 'ACTIVE');

DECLARE @acc114 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc114, @driverRole2, 'driver114', '123456', N'Pham Anh Son 114', 'customer114@gmail.com', '0928402899', 'ACTIVE');

DECLARE @cus114 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus114, @acc114, N'Pham Anh Son 114', '0928402899', 'customer114@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus114, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X7-00114', N'Honda', N'Yellow', 'ACTIVE');

DECLARE @acc115 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc115, @driverRole2, 'driver115', '123456', N'Phan Quoc Phuc 115', 'customer115@gmail.com', '0988226141', 'ACTIVE');

DECLARE @cus115 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus115, @acc115, N'Phan Quoc Phuc 115', '0988226141', 'customer115@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus115, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Car'), N'51A-00115', N'Hyundai', N'Green', 'ACTIVE');

DECLARE @acc116 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc116, @driverRole2, 'driver116', '123456', N'Pham Van Linh 116', 'customer116@gmail.com', '0963274968', 'ACTIVE');

DECLARE @cus116 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus116, @acc116, N'Pham Van Linh 116', '0963274968', 'customer116@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus116, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X9-00116', N'SYM', N'Yellow', 'ACTIVE');

DECLARE @acc117 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc117, @driverRole2, 'driver117', '123456', N'Do Bao Vy 117', 'customer117@gmail.com', '0979947232', 'ACTIVE');

DECLARE @cus117 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus117, @acc117, N'Do Bao Vy 117', '0979947232', 'customer117@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus117, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Bicycle'), N'BIKE-00117', N'Giant', N'Blue', 'ACTIVE');

DECLARE @acc118 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc118, @driverRole2, 'driver118', '123456', N'Mai Minh Son 118', 'customer118@gmail.com', '0918792171', 'ACTIVE');

DECLARE @cus118 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus118, @acc118, N'Mai Minh Son 118', '0918792171', 'customer118@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus118, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Motorbike'), N'59X2-00118', N'Yamaha', N'Gray', 'ACTIVE');

DECLARE @acc119 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc119, @driverRole2, 'driver119', '123456', N'Nguyen Duc Dung 119', 'customer119@gmail.com', '0948780377', 'ACTIVE');

DECLARE @cus119 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus119, @acc119, N'Nguyen Duc Dung 119', '0948780377', 'customer119@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus119, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Motorbike'), N'59X3-00119', N'VinFast', N'Green', 'ACTIVE');

DECLARE @acc120 UNIQUEIDENTIFIER = NEWID();
INSERT INTO ACCOUNT(account_id, role_id, username, password_hash, full_name, email, phone, status)
VALUES (@acc120, @driverRole2, 'driver120', '123456', N'Ngo Duc Chau 120', 'customer120@gmail.com', '0921029414', 'ACTIVE');

DECLARE @cus120 UNIQUEIDENTIFIER = NEWID();
INSERT INTO CUSTOMER(customer_id, account_id, full_name, phone, email, status)
VALUES (@cus120, @acc120, N'Ngo Duc Chau 120', '0921029414', 'customer120@gmail.com', 'ACTIVE');

INSERT INTO VEHICLE(customer_id, vehicle_type_id, plate_number, brand, color, status)
VALUES (@cus120, (SELECT vehicle_type_id FROM VEHICLE_TYPE WHERE name = 'Electric Car'), N'51A-00120', N'VinFast', N'Green', 'ACTIVE');
GO

-- 13. VEHICLE_PACKAGE - 30 xe đăng ký gói tháng

INSERT INTO VEHICLE_PACKAGE(vehicle_id, package_id, start_date, end_date, status)
SELECT TOP 30
    v.vehicle_id,
    p.package_id,
    DATEADD(DAY, -ABS(CHECKSUM(NEWID())) % 20, CAST(GETDATE() AS DATE)),
    DATEADD(MONTH, p.duration_month, CAST(GETDATE() AS DATE)),
    'ACTIVE'
FROM VEHICLE v
JOIN PACKAGE p ON p.vehicle_type_id = v.vehicle_type_id
ORDER BY NEWID();
GO

-- 14. PARKING_ORDER - 85 lượt gửi xe

DECLARE @staffIn UNIQUEIDENTIFIER = (SELECT TOP 1 account_id FROM ACCOUNT WHERE username = 'staff01');
DECLARE @staffOut UNIQUEIDENTIFIER = (SELECT TOP 1 account_id FROM ACCOUNT WHERE username = 'staff02');

;WITH VehicleList AS (
    SELECT TOP 85 ROW_NUMBER() OVER (ORDER BY NEWID()) AS rn, vehicle_id, vehicle_type_id
    FROM VEHICLE
),
AvailableCards AS (
    SELECT TOP 85 ROW_NUMBER() OVER (ORDER BY code) AS rn, card_id
    FROM CARD
),
AvailableSlots AS (
    SELECT TOP 85 ROW_NUMBER() OVER (ORDER BY NEWID()) AS rn, s.slot_id, a.vehicle_type_id
    FROM SLOT s
    JOIN AREA a ON a.area_id = s.area_id
    WHERE s.status = 'AVAILABLE'
),
GateIn AS (
    SELECT TOP 1 gate_id FROM GATE WHERE gate_type IN ('IN','BOTH') ORDER BY NEWID()
),
GateOut AS (
    SELECT TOP 1 gate_id FROM GATE WHERE gate_type IN ('OUT','BOTH') ORDER BY NEWID()
)
INSERT INTO PARKING_ORDER(vehicle_id, card_id, slot_id, gate_in_id, gate_out_id, staff_in_id, staff_out_id, time_in, time_out, estimated_fee, final_fee, status)
SELECT
    v.vehicle_id,
    c.card_id,
    s.slot_id,
    (SELECT gate_id FROM GateIn),
    CASE WHEN v.rn <= 30 THEN (SELECT gate_id FROM GateOut) ELSE NULL END,
    @staffIn,
    CASE WHEN v.rn <= 30 THEN @staffOut ELSE NULL END,
    DATEADD(HOUR, -1 * (1 + (v.rn % 72)), SYSDATETIME()),
    CASE WHEN v.rn <= 30 THEN DATEADD(HOUR, -1 * (v.rn % 12), SYSDATETIME()) ELSE NULL END,
    CASE WHEN v.rn % 5 = 0 THEN 60000 ELSE 15000 END,
    CASE WHEN v.rn <= 30 THEN CASE WHEN v.rn % 5 = 0 THEN 60000 ELSE 15000 END ELSE 0 END,
    CASE WHEN v.rn <= 30 THEN 'COMPLETED' ELSE 'PARKING' END
FROM VehicleList v
JOIN AvailableCards c ON c.rn = v.rn
JOIN AvailableSlots s ON s.rn = v.rn;
GO

-- Cập nhật slot đã có xe
UPDATE s
SET s.status = 'OCCUPIED'
FROM SLOT s
JOIN PARKING_ORDER po ON po.slot_id = s.slot_id
WHERE po.status = 'PARKING';
GO

-- Cập nhật card đang sử dụng
UPDATE c
SET c.status = 'IN_USE'
FROM CARD c
JOIN PARKING_ORDER po ON po.card_id = c.card_id
WHERE po.status = 'PARKING';
GO

-- 15. PAYMENT - thanh toán cho lượt đã hoàn thành

INSERT INTO PAYMENT(parking_order_id, amount, payment_method, payment_time, status)
SELECT
    parking_order_id,
    final_fee,
    CASE WHEN ABS(CHECKSUM(NEWID())) % 3 = 0 THEN 'BANKING'
         WHEN ABS(CHECKSUM(NEWID())) % 3 = 1 THEN 'CASH'
         ELSE 'MOMO' END,
    ISNULL(time_out, SYSDATETIME()),
    'PAID'
FROM PARKING_ORDER
WHERE status = 'COMPLETED';
GO

-- 16. RESERVATION - 25 đặt chỗ

;WITH V AS (
    SELECT TOP 25 ROW_NUMBER() OVER (ORDER BY NEWID()) rn, vehicle_id, vehicle_type_id
    FROM VEHICLE
),
S AS (
    SELECT TOP 25 ROW_NUMBER() OVER (ORDER BY NEWID()) rn, s.slot_id, a.vehicle_type_id
    FROM SLOT s
    JOIN AREA a ON a.area_id = s.area_id
    WHERE s.status = 'AVAILABLE'
)
INSERT INTO RESERVATION(vehicle_id, slot_id, start_time, end_time, status)
SELECT
    V.vehicle_id,
    S.slot_id,
    DATEADD(HOUR, 2 + V.rn, SYSDATETIME()),
    DATEADD(HOUR, 5 + V.rn, SYSDATETIME()),
    CASE WHEN V.rn % 5 = 0 THEN 'CANCELLED' ELSE 'RESERVED' END
FROM V
JOIN S ON S.rn = V.rn;
GO

UPDATE s
SET s.status = 'RESERVED'
FROM SLOT s
JOIN RESERVATION r ON r.slot_id = s.slot_id
WHERE r.status = 'RESERVED';
GO

-- 17. INCIDENT_REPORT - 12 sự cố

DECLARE @handler UNIQUEIDENTIFIER = (SELECT TOP 1 account_id FROM ACCOUNT WHERE username LIKE 'staff%');

INSERT INTO INCIDENT_REPORT(parking_order_id, incident_type, description, penalty_fee, handled_by, status, created_at, resolved_at)
SELECT TOP 12
    parking_order_id,
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY parking_order_id) % 4 = 0 THEN 'LOST_CARD'
        WHEN ROW_NUMBER() OVER (ORDER BY parking_order_id) % 4 = 1 THEN 'WRONG_PLATE'
        WHEN ROW_NUMBER() OVER (ORDER BY parking_order_id) % 4 = 2 THEN 'OVERDUE'
        ELSE 'WRONG_AREA'
    END,
    N'Dữ liệu sự cố mẫu phục vụ demo SWP391',
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY parking_order_id) % 4 = 0 THEN 50000
        WHEN ROW_NUMBER() OVER (ORDER BY parking_order_id) % 4 = 2 THEN 30000
        ELSE 0
    END,
    @handler,
    CASE WHEN ROW_NUMBER() OVER (ORDER BY parking_order_id) % 3 = 0 THEN 'OPEN' ELSE 'RESOLVED' END,
    DATEADD(HOUR, -ABS(CHECKSUM(NEWID())) % 48, SYSDATETIME()),
    CASE WHEN ROW_NUMBER() OVER (ORDER BY parking_order_id) % 3 = 0 THEN NULL ELSE SYSDATETIME() END
FROM PARKING_ORDER
ORDER BY NEWID();
GO

-- 18. SLOT_ALLOCATION_LOG - log gợi ý slot AI

INSERT INTO SLOT_ALLOCATION_LOG(parking_order_id, suggested_slot_id, actual_slot_id, vehicle_type_id, algorithm_name, reason, distance_score, occupancy_score, priority_score)
SELECT TOP 60
    po.parking_order_id,
    po.slot_id,
    po.slot_id,
    v.vehicle_type_id,
    'RuleBasedNearestAvailableSlot',
    N'Gợi ý slot dựa trên loại xe, khoảng cách đến cổng và tỷ lệ lấp đầy khu vực',
    CAST(70 + (ABS(CHECKSUM(NEWID())) % 30) AS DECIMAL(10,2)),
    CAST(60 + (ABS(CHECKSUM(NEWID())) % 40) AS DECIMAL(10,2)),
    CAST(65 + (ABS(CHECKSUM(NEWID())) % 35) AS DECIMAL(10,2))
FROM PARKING_ORDER po
JOIN VEHICLE v ON v.vehicle_id = po.vehicle_id
WHERE po.slot_id IS NOT NULL
ORDER BY NEWID();
GO

-- 19. FEEDBACK - 40 feedback

INSERT INTO FEEDBACK(customer_id, parking_order_id, content, rating, status)
SELECT TOP 40
    v.customer_id,
    po.parking_order_id,
    CASE 
        WHEN ABS(CHECKSUM(NEWID())) % 5 = 0 THEN N'Bãi xe sạch, nhân viên hỗ trợ tốt'
        WHEN ABS(CHECKSUM(NEWID())) % 5 = 1 THEN N'Cần thêm biển chỉ dẫn vị trí slot'
        WHEN ABS(CHECKSUM(NEWID())) % 5 = 2 THEN N'Thanh toán nhanh, dễ sử dụng'
        WHEN ABS(CHECKSUM(NEWID())) % 5 = 3 THEN N'Giờ cao điểm hơi đông'
        ELSE N'Hệ thống gợi ý chỗ đỗ khá hợp lý'
    END,
    3 + (ABS(CHECKSUM(NEWID())) % 3),
    'REVIEWED'
FROM PARKING_ORDER po
JOIN VEHICLE v ON v.vehicle_id = po.vehicle_id
ORDER BY NEWID();
GO

/* Kiểm tra số lượng dữ liệu */
SELECT 'ROLE' AS table_name, COUNT(*) AS total FROM ROLE
UNION ALL SELECT 'ACCOUNT', COUNT(*) FROM ACCOUNT
UNION ALL SELECT 'CUSTOMER', COUNT(*) FROM CUSTOMER
UNION ALL SELECT 'VEHICLE_TYPE', COUNT(*) FROM VEHICLE_TYPE
UNION ALL SELECT 'VEHICLE', COUNT(*) FROM VEHICLE
UNION ALL SELECT 'BUILDING', COUNT(*) FROM BUILDING
UNION ALL SELECT 'PARKING', COUNT(*) FROM PARKING
UNION ALL SELECT 'FLOOR', COUNT(*) FROM FLOOR
UNION ALL SELECT 'AREA', COUNT(*) FROM AREA
UNION ALL SELECT 'SLOT', COUNT(*) FROM SLOT
UNION ALL SELECT 'GATE', COUNT(*) FROM GATE
UNION ALL SELECT 'CARD', COUNT(*) FROM CARD
UNION ALL SELECT 'PRICE_TABLE', COUNT(*) FROM PRICE_TABLE
UNION ALL SELECT 'PRICE_ITEM', COUNT(*) FROM PRICE_ITEM
UNION ALL SELECT 'PACKAGE', COUNT(*) FROM PACKAGE
UNION ALL SELECT 'VEHICLE_PACKAGE', COUNT(*) FROM VEHICLE_PACKAGE
UNION ALL SELECT 'PARKING_ORDER', COUNT(*) FROM PARKING_ORDER
UNION ALL SELECT 'PAYMENT', COUNT(*) FROM PAYMENT
UNION ALL SELECT 'RESERVATION', COUNT(*) FROM RESERVATION
UNION ALL SELECT 'INCIDENT_REPORT', COUNT(*) FROM INCIDENT_REPORT
UNION ALL SELECT 'SLOT_ALLOCATION_LOG', COUNT(*) FROM SLOT_ALLOCATION_LOG
UNION ALL SELECT 'FEEDBACK', COUNT(*) FROM FEEDBACK;
GO
