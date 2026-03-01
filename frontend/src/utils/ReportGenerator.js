import { jsPDF } from 'jspdf';

export const generateClientReport = (portfolioName = "My Portfolio", portfolioData = null) => {
    try {
        if (!portfolioData) {
            alert("No portfolio data available to export.");
            return;
        }

        const { tickers, weights, metrics: manualData, optimizationData } = portfolioData;
        const currentMetrics = manualData?.metrics || {};
        const factorAnalysis = manualData?.factor_analysis || null;
        const attribution = manualData?.attribution || null;
        const correlation = manualData?.correlation || null;
        const stress_test = manualData?.stress_test || null;
        const var_metrics = manualData?.var_metrics || null;
        const mctr_metrics = manualData?.mctr_metrics || null;
        const metadata = manualData?.metadata || { period: '5y', risk_free_rate: 0.04 };

        // Setup PDF Document
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
        const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
        const margin = 20;
        const contentWidth = pageWidth - margin * 2; // 170mm
        let cursorY = 25;

        // Color palettes
        const colors = {
            primary: [37, 99, 235],    // Blue 600
            secondary: [75, 85, 99],   // Gray 600
            dark: [17, 24, 39],        // Gray 900
            light: [243, 244, 246],    // Gray 100
            white: [255, 255, 255]
        };

        const formatPct = (val) => val != null ? (val * 100).toFixed(2) + '%' : 'N/A';
        const formatNum = (val) => val != null ? val.toFixed(2) : 'N/A';

        // Helper: Check Page Break securely
        const checkPageBreak = (neededHeight) => {
            if (cursorY + neededHeight > pageHeight - margin) {
                pdf.addPage();
                cursorY = margin;
                drawPageBorder();
            }
        };

        const drawPageBorder = () => {
            // Draw a sophisticated top bar
            pdf.setFillColor(...colors.primary);
            pdf.rect(0, 0, pageWidth, 5, 'F');

            // Footer
            const totalPages = pdf.internal.getNumberOfPages();
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.setFont("helvetica", "normal");
            pdf.text(`MaaS Risk Engine | Proprietary & Confidential`, margin, pageHeight - 10);
            pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        };

        // Helper: Draw Section Title
        const drawSection = (title) => {
            checkPageBreak(25);
            cursorY += 5;
            pdf.setFontSize(14);
            pdf.setTextColor(...colors.primary);
            pdf.setFont("helvetica", "bold");
            pdf.text(title.toUpperCase(), margin, cursorY);

            // Draw underline
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.5);
            pdf.line(margin, cursorY + 2, pageWidth - margin, cursorY + 2);

            cursorY += 12;
        };

        // Helper: Custom Table Drawer
        const drawTable = (headers, rows, colWidths = []) => {
            const rowHeight = 8;
            checkPageBreak(rowHeight * (rows.length + 2));

            const startX = margin;
            if (colWidths.length === 0) {
                const w = contentWidth / headers.length;
                colWidths = headers.map(() => w);
            }

            // Draw Header
            pdf.setFillColor(...colors.dark);
            pdf.setTextColor(...colors.white);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            pdf.rect(startX, cursorY, contentWidth, rowHeight, 'F');

            let currentX = startX;
            headers.forEach((h, i) => {
                const align = i === 0 ? 'left' : 'right';
                const xOffset = align === 'left' ? 3 : colWidths[i] - 3;
                pdf.text(h, currentX + xOffset, cursorY + 5.5, { align });
                currentX += colWidths[i];
            });
            cursorY += rowHeight;

            // Draw Rows
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "normal");

            rows.forEach((row, rowIndex) => {
                checkPageBreak(rowHeight);
                if (rowIndex % 2 === 0) {
                    pdf.setFillColor(...colors.light);
                    pdf.rect(startX, cursorY, contentWidth, rowHeight, 'F');
                }

                pdf.setTextColor(...colors.dark);
                let cx = startX;
                row.forEach((cell, i) => {
                    const align = i === 0 ? 'left' : 'right';
                    const xOffset = align === 'left' ? 3 : colWidths[i] - 3;
                    pdf.text(String(cell), cx + xOffset, cursorY + 5.5, { align });
                    cx += colWidths[i];
                });

                cursorY += rowHeight;
            });

            // Bottom border
            pdf.setDrawColor(...colors.primary);
            pdf.setLineWidth(1);
            pdf.line(startX, cursorY, pageWidth - margin, cursorY);
            cursorY += 12; // Extra padding after table
        };

        // === START DOCUMENT ===
        drawPageBorder();

        // --- COVER PAGE ---
        pdf.setFontSize(32);
        pdf.setTextColor(...colors.dark);
        pdf.setFont("helvetica", "bold");
        pdf.text("MaaS INSTITUTIONAL", pageWidth / 2, cursorY + 50, { align: 'center' });

        pdf.setFontSize(16);
        pdf.setTextColor(...colors.primary);
        pdf.text("Portfolio Risk & Optimization Analysis", pageWidth / 2, cursorY + 62, { align: 'center' });

        pdf.setFontSize(11);
        pdf.setTextColor(100, 100, 100);
        pdf.setFont("helvetica", "normal");

        // Meta Information
        cursorY += 120;
        pdf.text(`Prepared For:`, margin, cursorY);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.dark);
        pdf.text(portfolioName, margin, cursorY + 6);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Analysis Parameters:`, margin + 100, cursorY);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...colors.dark);
        const lookback = metadata.period.toUpperCase();
        pdf.text(`Data Horizon: Trailing ${lookback} Daily`, margin + 100, cursorY + 6);
        pdf.text(`Base Risk-Free Rate: ${formatPct(metadata.risk_free_rate)}`, margin + 100, cursorY + 12);
        pdf.text(`Report Date: ${new Date().toLocaleDateString()}`, margin + 100, cursorY + 18);

        cursorY += 80;

        // --- PAGE 2: EXEC SUMMARY ---
        pdf.addPage();
        cursorY = margin;
        drawPageBorder();

        drawSection("Executive Summary");
        pdf.setFontSize(10);
        pdf.setTextColor(...colors.secondary);
        pdf.setFont("helvetica", "normal");
        const summaryText = `This comprehensive portfolio analysis outlines the ex-ante risk and return characteristics of the current asset allocation. Included in this report is an analysis of implied factor exposures, performance attribution, and algorithmic recommendations for optimal capital allocation based on Modern Portfolio Theory and fixed income dynamics.\n\nMethodology Note: All expected returns, volatilities, and covariance matrices are estimated using trailing ${lookback} daily data. The algorithm assumes a continuous compounding risk-free rate of ${formatPct(metadata.risk_free_rate)}.`;
        const lines = pdf.splitTextToSize(summaryText, contentWidth);
        pdf.text(lines, margin, cursorY);
        cursorY += lines.length * 5 + 10;

        // High Level Metrics
        drawSection("Risk & Return Profile");

        const metricColWidths = [contentWidth * 0.4, contentWidth * 0.6];
        const riskMetricsRows = [
            ["Expected Annual Return", formatPct(currentMetrics?.return)],
            ["Estimated Volatility (Risk)", formatPct(currentMetrics?.volatility)],
            ["Sharpe Ratio", formatNum(currentMetrics?.sharpe)]
        ];

        if (var_metrics) {
            riskMetricsRows.push(["Historical Value at Risk (1D, 95%)", formatPct(var_metrics.var_1d)]);
            riskMetricsRows.push(["Expected Shortfall / CVaR (1D, 95%)", formatPct(var_metrics.cvar_1d)]);
        }

        drawTable(
            ["Metric", "Current Portfolio"],
            riskMetricsRows,
            metricColWidths
        );

        // Asset Allocation
        drawSection("Portfolio Composition");

        const allocHeaders = mctr_metrics ? ["Asset / Ticker", "Class", "Weight", "Return", "Volatility", "MCTR (%)"] : ["Asset / Ticker", "Class", "Weight", "Return", "Volatility"];
        const allocWidths = mctr_metrics ? [35, 30, 25, 25, 25, 30] : [40, 40, 30, 30, 30]; // Must total 170
        const allocRows = [];

        const _indAssets = optimizationData?.individual_assets || [];
        _indAssets.forEach(asset => {
            const t = asset.ticker;
            let w = weights && weights[t] ? weights[t] : 0;
            const type = asset.asset_class || (asset.is_bond ? 'Fixed Income' : 'Equity');

            const row = [
                t,
                type,
                (w * 100).toFixed(1) + '%',
                formatPct(asset.return),
                formatPct(asset.volatility)
            ];

            if (mctr_metrics) {
                row.push(formatPct(mctr_metrics[t]));
            }

            allocRows.push(row);
        });

        // Sort rows by weight descending
        allocRows.sort((a, b) => parseFloat(b[2]) - parseFloat(a[2]));
        drawTable(allocHeaders, allocRows, allocWidths);

        // Fixed Income Deep Dive
        const bondAssets = _indAssets.filter(a => a.is_bond);
        if (bondAssets.length > 0) {
            drawSection("Fixed Income Analytics (Interest Rate Sensitivity)");
            const bondHeaders = ["Ticker", "Yield to Maturity", "Mac. Duration", "Mod. Duration", "Convexity"];
            const bondWidths = [30, 35, 35, 35, 35];
            const bondRows = bondAssets.map(b => [
                b.ticker,
                formatPct(b.ytm),
                b.macaulay_duration ? b.macaulay_duration.toFixed(2) + " yrs" : "N/A",
                b.modified_duration ? b.modified_duration.toFixed(2) + " yrs" : "N/A",
                b.convexity ? b.convexity.toFixed(2) : "N/A"
            ]);
            drawTable(bondHeaders, bondRows, bondWidths);
        }

        // --- SECTION: Advanced Analytics ---
        if (factorAnalysis || attribution) {
            drawSection("Advanced Quantitative Analytics");

            if (factorAnalysis) {
                pdf.setFontSize(11);
                pdf.setTextColor(...colors.dark);
                pdf.setFont("helvetica", "bold");
                pdf.text("Fama-French Factor Exposures", margin, cursorY);
                cursorY += 10;

                drawTable(
                    ["Factor", "Coefficient (Beta)"],
                    [
                        ["Market (MKT-RF)", formatNum(factorAnalysis.market_beta)],
                        ["Size (SMB)", formatNum(factorAnalysis.size_beta)],
                        ["Value (HML)", formatNum(factorAnalysis.value_beta)],
                        ["Alpha (Annualized)", formatPct(factorAnalysis.alpha)],
                        ["Regression R-Squared", formatPct(factorAnalysis.r_squared)]
                    ],
                    [contentWidth * 0.6, contentWidth * 0.4]
                );
            }

            if (attribution && attribution.contributions) {
                pdf.setFontSize(11);
                pdf.setTextColor(...colors.dark);
                pdf.setFont("helvetica", "bold");
                pdf.text("Performance Attribution (Ex-Post Contributors)", margin, cursorY);
                cursorY += 10;

                const attRows = Object.entries(attribution.contributions)
                    .sort(([, a], [, b]) => b - a)
                    .map(([t, val]) => [t, formatPct(val)]);

                drawTable(
                    ["Asset", "Contribution to Total Return"],
                    attRows,
                    [contentWidth * 0.6, contentWidth * 0.4]
                );
            }
        }

        // --- SECTION: Correlation Matrix ---
        if (correlation && correlation.length > 0 && tickers) {
            drawSection("Asset Correlation Matrix");
            pdf.setFontSize(10);
            pdf.setTextColor(...colors.secondary);
            pdf.setFont("helvetica", "normal");
            pdf.text("Statistical measure of how assets move relative to one another (range: -1.0 to 1.0).", margin, cursorY);
            cursorY += 10;

            const numAssets = tickers.length;
            const headers = ["Ticker", ...tickers];

            // Auto size columns to fit across page cleanly
            const labelWidth = Math.max(30, contentWidth * 0.2); // Ticker column width
            const remainWidth = contentWidth - labelWidth;
            const cellWidth = numAssets > 0 ? (remainWidth / numAssets) : 20;
            const corrWidths = [labelWidth, ...Array(numAssets).fill(cellWidth)];

            const corrRows = tickers.map((ticker, rIdx) => {
                const row = [ticker];
                for (let cIdx = 0; cIdx < numAssets; cIdx++) {
                    const val = correlation[rIdx][cIdx];
                    row.push(val != null ? val.toFixed(2) : "-");
                }
                return row;
            });

            drawTable(headers, corrRows, corrWidths);
        }

        // --- SECTION: Stress Testing & Scenario Analysis ---
        if (stress_test && stress_test.scenarios) {
            drawSection("Stress Testing & Scenario Analysis");
            pdf.setFontSize(10);
            pdf.setTextColor(...colors.secondary);
            pdf.setFont("helvetica", "normal");
            pdf.text("Estimated portfolio drawdown in historical and hypothetical macroeconomic stress events. Projections scale the defined baseline shock parameter against the portfolio's realized market beta.", margin, cursorY);
            cursorY += 10;

            const stressHeaders = ["Macroeconomic Scenario", "Estimated Portfolio Drawdown"];
            const stressWidths = [contentWidth * 0.6, contentWidth * 0.4];

            const stressRows = Object.entries(stress_test.scenarios).map(([scenario, impact]) => [scenario, formatPct(impact)]);
            drawTable(stressHeaders, stressRows, stressWidths);

            pdf.setFontSize(10);
            pdf.setTextColor(...colors.dark);
            pdf.setFont("helvetica", "bold");
            pdf.text(`Portfolio Beta used for shock scaling: ${formatNum(stress_test.beta)}`, margin, cursorY);
            cursorY += 15;
            pdf.setFont("helvetica", "normal");
        }

        // --- SECTION: Optimization Alternatives ---
        if (optimizationData?.max_sharpe_portfolio && optimizationData?.min_vol_portfolio) {
            drawSection("Optimization Alternatives (Efficient Frontier)");

            pdf.setFontSize(10);
            pdf.setTextColor(...colors.secondary);
            pdf.setFont("helvetica", "normal");
            pdf.text("Mathematical optimization targets based on Modern Portfolio Theory.", margin, cursorY);
            cursorY += 10;

            const optHeaders = ["Portfolio Strategy", "Expected Return", "Volatility", "Sharpe Ratio"];
            const optWidths = [65, 35, 35, 35];

            const ms = optimizationData.max_sharpe_portfolio.metrics;
            const mv = optimizationData.min_vol_portfolio.metrics;

            drawTable(optHeaders, [
                ["Current Allocation", formatPct(currentMetrics?.return), formatPct(currentMetrics?.volatility), formatNum(currentMetrics?.sharpe)],
                ["Max Sharpe (Optimal Risk-Adjusted)", formatPct(ms?.return), formatPct(ms?.volatility), formatNum(ms?.sharpe)],
                ["Minimum Volatility (Lowest Risk)", formatPct(mv?.return), formatPct(mv?.volatility), formatNum(mv?.sharpe)]
            ], optWidths);

            // Show weights for max sharpe
            pdf.setFontSize(11);
            pdf.setTextColor(...colors.dark);
            pdf.setFont("helvetica", "bold");
            pdf.text("Recommended Action: Maximum Sharpe Ratio Allocation", margin, cursorY);
            cursorY += 10;

            const msWeights = Object.entries(optimizationData.max_sharpe_portfolio.weights)
                .filter(([_, w]) => w > 0.01)
                .sort(([, a], [, b]) => b - a)
                .map(([t, w]) => [t, formatPct(w)]);

            drawTable(["Ticker", "Target Weight"], msWeights, [contentWidth * 0.6, contentWidth * 0.4]);
        }

        // --- SECTION: Risk Mitigation Strategies ---
        drawSection("Risk Mitigation Strategies");
        pdf.setFontSize(9);
        pdf.setTextColor(...colors.secondary);
        pdf.setFont("helvetica", "normal");

        const beta = stress_test ? stress_test.beta : (factorAnalysis ? factorAnalysis.market_beta : 1.0);
        const vol = currentMetrics.volatility || 0.15;

        let mitigationBullets = [];

        // Beta-based mitigation
        if (beta > 1.1) {
            mitigationBullets.push("• High Market Sensitivity: The portfolio's Beta > 1 is driving excess drawdown risk. Consider hedging with low-beta/defensive consumer staples equities or increasing fixed income allocation to cushion market drops entirely.");
        } else if (beta < 0.8) {
            mitigationBullets.push("• Capital Efficiency: The portfolio has defensive properties but may lag during strong bull markets. Consider tactical options overlays (e.g., covered calls) to generate premium on defensive holdings without adding systemic equity risk.");
        } else {
            mitigationBullets.push("• Core Allocation: The portfolio moves largely in tandem with the broader market. Risk mitigation should focus on tail-risk hedges such as out-of-the-money put spreads on the SPY benchmark.");
        }

        // Volatility-based mitigation
        if (vol > 0.18) {
            mitigationBullets.push(`• Elevated Volatility Factor: Ex-ante standalone risk exceeds 18% (${formatPct(vol)} estimated). Systematic de-risking into short-duration Treasury bills or physical gold can mathematically dampen specific asset volatility through deep negative correlation.`);
        }

        // Optimization heuristic
        if (optimizationData?.max_sharpe_portfolio) {
            const ms = optimizationData.max_sharpe_portfolio.metrics;
            if (ms.sharpe > (currentMetrics.sharpe || 0) + 0.1) {
                mitigationBullets.push(`• Sub-Optimal Risk/Reward: The current allocation leaves Sharpe ratio on the table (${formatNum(currentMetrics.sharpe)} current vs ${formatNum(ms.sharpe)} potential). Rebalancing toward the algorithmic Efficient Frontier targets is the most direct mitigation strategy to improve expected return per unit of risk.`);
            }
        }

        pdf.setTextColor(...colors.dark);
        mitigationBullets.forEach(bullet => {
            checkPageBreak(15);
            const lines = pdf.splitTextToSize(bullet, contentWidth - 5);
            pdf.text(lines, margin + 5, cursorY);
            cursorY += lines.length * 4.5 + 4;
        });
        cursorY += 10;

        // Add page numbers on the final pass
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        // Trigger safe file download synchronously
        const safeName = portfolioName ? portfolioName.replace(/\s+/g, '_') : 'Portfolio';
        pdf.save(`MaaS_Institutional_Report_${safeName}.pdf`);

    } catch (error) {
        console.error("PDF Generation Critical Failure:", error);
        alert("Report Could Not Be Generated: " + error.message);
    }
};
